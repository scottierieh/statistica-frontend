'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import Image from 'next/image';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';  // 👈 이 줄 추가
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import {
    Sigma, Loader2, Users, HelpCircle, TrendingUp, Target, Layers, CheckCircle, AlertTriangle, Lightbulb, BookOpen, Activity, Download, FileSpreadsheet, ImageIcon, FileText, Code, Database, Settings, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, Info, ChevronDown, Sparkles, Play, BarChart as BarChartIcon, XCircle, Copy, BarChart3, FileSearch
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-dm6treznqq-du.a.run.app';

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/two_way_anova.py?alt=media";


const twoWayAnovaMetricDefinitions: Record<string, string> = {
    two_way_anova: "Two-Way ANOVA tests the effects of two independent categorical factors (Factor A and Factor B) on a continuous dependent variable, including their interaction effect.",
    main_effect: "The effect of one factor on the dependent variable, averaged across all levels of the other factor. Tests whether Factor A or Factor B independently influences the outcome.",
    interaction_effect: "Tests whether the effect of one factor depends on the level of the other factor. A significant interaction means the factors work together in a non-additive way.",
    f_statistic: "The F-statistic represents the ratio of systematic variance to error variance. Larger values indicate more significant effects.",
    p_value: "The probability of obtaining results at least as extreme as observed, assuming the null hypothesis is true. Values below 0.05 typically indicate statistical significance.",
    partial_eta_squared: "Partial eta squared (η²p) measures the proportion of variance in the DV explained by each effect, controlling for other effects. 0.01 = small, 0.06 = medium, 0.14 = large.",
    partial_omega_squared: "Partial omega squared (ω²p) is an unbiased estimate of effect size, less inflated by sample size than η²p. Generally smaller than η²p.",
    sum_of_squares: "Sum of Squares (SS) quantifies the total variability in the data. Partitioned into SS for Factor A, Factor B, interaction, and residual error.",
    degrees_of_freedom: "Degrees of freedom (df) represent the number of independent values that can vary. Each source of variation has its own df.",
    mean_square: "Mean Square (MS) is the average variance for each source, calculated as SS/df. Used to compute F-ratios.",
    type_i_ss: "Type I (Sequential) SS: Tests effects in order. Each effect is adjusted only for effects earlier in the model. Sensitive to order.",
    type_ii_ss: "Type II (Hierarchical) SS: Tests each main effect adjusted for the other main effect, but not for the interaction. Rarely used in factorial designs.",
    type_iii_ss: "Type III (Marginal) SS: Tests each effect adjusted for all other effects. Most commonly used, especially for unbalanced designs. SPSS default.",
    tukey_hsd: "Tukey's Honestly Significant Difference: A post-hoc test that controls family-wise error rate. Assumes equal variances and is appropriate when homogeneity assumption is met.",
    games_howell: "Games-Howell test: A post-hoc test that does not assume equal variances. More robust than Tukey when homogeneity of variance is violated.",
    simple_main_effects: "When interaction is significant, simple main effects test the effect of one factor at each level of the other factor. Reveals where the interaction occurs.",
    cell_means: "The average value of the dependent variable for each unique combination of Factor A and Factor B levels.",
    marginal_means: "The average of the dependent variable across all levels of one factor, collapsing across the other factor. Used to interpret main effects.",
    factorial_design: "A study design with two or more factors, where all combinations of factor levels are tested. Allows testing of main effects and interactions.",
    homogeneity_of_variance: "The assumption that all groups have equal population variances. Tested with Levene's or Brown-Forsythe test. If violated, use Games-Howell post-hoc.",
    levene_test: "Tests equality of variances across groups. Non-significant result (p > .05) indicates equal variances, supporting standard ANOVA assumptions.",
    brown_forsythe: "A more robust version of Levene's test, using deviations from the median instead of mean. Recommended for determining post-hoc test choice.",
    normality_assumption: "ANOVA assumes the dependent variable is normally distributed within each group. Tested with Shapiro-Wilk. Robust to violations with large samples.",
    shapiro_wilk: "A statistical test for normality. Non-significant result (p > .05) suggests the data is approximately normally distributed.",
    balanced_design: "When all cells have equal sample sizes. Allows use of any SS type and maximizes statistical power.",
    unbalanced_design: "When cells have unequal sample sizes. Type III SS is recommended. May reduce power and complicate interpretation.",
    null_hypothesis: "H₀: All group means are equal. For main effects: no difference across factor levels. For interaction: effects are additive (no interaction).",
    alternative_hypothesis: "H₁: At least one group mean differs. For interaction: the effect of one factor depends on the level of the other factor.",
    alpha_level: "The significance level (typically α = 0.05) is the threshold for rejecting the null hypothesis. Controls Type I error rate.",
    bonferroni_correction: "Adjusts significance level when making multiple comparisons to control family-wise error rate. Divides α by the number of tests.",
    statistical_power: "The probability of correctly detecting a true effect. Higher power (typically 80%+) reduces Type II error risk.",
    effect_size: "A standardized measure of the magnitude of an effect. Unlike p-values, effect sizes are independent of sample size and indicate practical significance.",
};



const TwoWayAnovaGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Two-Way ANOVA Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Two-Way ANOVA */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                What is Two-Way ANOVA?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Two-Way ANOVA (Analysis of Variance) tests whether two categorical factors simultaneously 
                influence a continuous outcome. Unlike one-way ANOVA, it also detects <strong>interaction effects</strong> — 
                whether the impact of one factor depends on the level of another factor.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Real-world example:</strong> Testing if both "training method" and "experience level" 
                  affect employee performance. The interaction tells you if advanced training works differently 
                  for novices vs. experts.
                </p>
              </div>
            </div>
  
            <Separator />
  
            {/* When to Use It */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use Two-Way ANOVA?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• You have <strong>two categorical predictors</strong> (e.g., gender + education level)</li>
                    <li>• You want to test if they <strong>independently or jointly</strong> affect an outcome</li>
                    <li>• You need to detect <strong>interaction effects</strong> between factors</li>
                    <li>• Each group has at least 3-5 observations for reliable results</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                    Don't use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• Your outcome is categorical (use logistic regression instead)</li>
                    <li>• You have more than 2 factors (consider three-way ANOVA or factorial designs)</li>
                    <li>• Sample sizes are very small (n &lt; 20 total)</li>
                    <li>• Your data has severe outliers or non-normal distributions</li>
                  </ul>
                </div>
              </div>
            </div>
  
            <Separator />
  
            {/* How It Works */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                How Two-Way ANOVA Works
              </h3>
              <div className="space-y-4">
                <div className="pl-4 border-l-2 border-primary/30">
                  <p className="font-medium text-sm">1. Variance Decomposition</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ANOVA splits total variance into components: <strong>Factor A effect</strong>, 
                    <strong>Factor B effect</strong>, <strong>Interaction (A × B)</strong>, and 
                    <strong>Random Error</strong>. Each is tested against error variance.
                  </p>
                </div>
  
                <div className="pl-4 border-l-2 border-primary/30">
                  <p className="font-medium text-sm">2. F-Ratio Calculation</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    F = (Variance explained by factor) / (Unexplained variance)<br/>
                    Larger F-values indicate the factor explains more variation than random chance. 
                    P-values below 0.05 typically indicate statistical significance.
                  </p>
                </div>
  
                <div className="pl-4 border-l-2 border-primary/30">
                  <p className="font-medium text-sm">3. Effect Size (η²p and ω²p)</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Partial eta-squared (η²p):</strong> Proportion of variance explained (0.01=small, 0.06=medium, 0.14=large)<br/>
                    <strong>Partial omega-squared (ω²p):</strong> Unbiased estimate, less inflated by sample size
                  </p>
                </div>
  
                <div className="pl-4 border-l-2 border-primary/30">
                  <p className="font-medium text-sm">4. Post-hoc Tests</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    If ANOVA shows significance, <strong>Tukey HSD</strong> (equal variances) or 
                    <strong>Games-Howell</strong> (unequal variances) identify which specific groups differ. 
                    These control for multiple comparison errors.
                  </p>
                </div>
              </div>
            </div>
  
            <Separator />
  
            {/* Understanding Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Interpreting Your Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Main Effect of Factor A</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Significant (p &lt; .05):</strong> Factor A influences the outcome, averaged across all levels of Factor B. 
                    Check post-hoc tests to see which levels of A differ.<br/>
                    <strong>Not significant:</strong> Factor A doesn't reliably affect the outcome on its own.
                  </p>
                </div>
  
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Main Effect of Factor B</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Significant (p &lt; .05):</strong> Factor B influences the outcome, independent of Factor A.<br/>
                    <strong>Not significant:</strong> Factor B has no clear impact on the outcome.
                  </p>
                </div>
  
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Interaction Effect (A × B) — The Key Insight!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Significant interaction:</strong> The effect of Factor A <em>depends on</em> the level of Factor B 
                    (or vice versa). Main effects alone are misleading — you must examine specific combinations.<br/>
                    <strong>Example:</strong> Training method works great for experts but hurts novice performance.<br/>
                    <strong>No interaction:</strong> Factors work independently — you can interpret main effects separately.
                  </p>
                </div>
              </div>
            </div>
  
            <Separator />
  
            {/* Practical Applications */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Real-World Applications
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Business & Marketing</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Test if ad format and platform jointly affect click-through rates</li>
                    <li>• Analyze if product pricing and customer segment interact on sales</li>
                    <li>• Determine optimal store layout by region and customer type</li>
                  </ul>
                </div>
  
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Education & Training</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Compare teaching methods across student ability levels</li>
                    <li>• Test if study time and learning style interact on test scores</li>
                    <li>• Evaluate training programs by employee role and experience</li>
                  </ul>
                </div>
  
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Healthcare & Science</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Test if treatment and patient age interact on recovery time</li>
                    <li>• Analyze drug efficacy by dosage and gender</li>
                    <li>• Study exercise type and diet on weight loss outcomes</li>
                  </ul>
                </div>
  
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Psychology & UX</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Test if UI design and user expertise affect task completion</li>
                    <li>• Analyze mood effects by time of day and personality type</li>
                    <li>• Study stress interventions across gender and age groups</li>
                  </ul>
                </div>
              </div>
            </div>
  
            <Separator />
  
            {/* Assumptions & Troubleshooting */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Assumptions & What to Do If They're Violated
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">1. Normality (Shapiro-Wilk test)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Assumption:</strong> The dependent variable should be approximately normally distributed within each group.<br/>
                    <strong>If violated (p &lt; .05):</strong> ANOVA is robust with n &gt; 30. For smaller samples, consider 
                    transforming data (log, sqrt) or use non-parametric alternatives (Kruskal-Wallis for one factor).
                  </p>
                </div>
  
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">2. Homogeneity of Variance (Levene/Brown-Forsythe)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Assumption:</strong> All groups should have similar variance (spread).<br/>
                    <strong>If violated (p &lt; .05):</strong> Use <strong>Games-Howell post-hoc test</strong> instead of Tukey HSD. 
                    This analysis automatically provides both options and recommends the appropriate one.
                  </p>
                </div>
  
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">3. Independence of Observations</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Assumption:</strong> Each observation should be independent (no repeated measures).<br/>
                    <strong>If violated:</strong> Use <strong>Repeated Measures ANOVA</strong> if the same subjects appear 
                    in multiple conditions, or mixed-effects models for complex designs.
                  </p>
                </div>
              </div>
            </div>
  
            <Separator />
  
            {/* Best Practices */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Best Practices for Two-Way ANOVA
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Before Analysis</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Check for outliers (box plots, scatter plots)</li>
                    <li>• Ensure balanced design when possible (equal group sizes)</li>
                    <li>• Have at least 3-5 observations per cell</li>
                    <li>• Visualize data with interaction plots first</li>
                  </ul>
                </div>
  
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpreting Results</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Always check interaction first — it changes everything!</li>
                    <li>• Report effect sizes (η²p), not just p-values</li>
                    <li>• Use post-hoc tests for significant effects with &gt;2 levels</li>
                    <li>• Visualize significant interactions with plots</li>
                  </ul>
                </div>
  
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• State F-statistic, df, p-value, and effect size</li>
                    <li>• Example: F(2, 117) = 8.45, p = .001, η²p = .126</li>
                    <li>• Describe interaction in plain language</li>
                    <li>• Include descriptive statistics (means ± SD) per group</li>
                  </ul>
                </div>
  
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Common Mistakes</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Ignoring significant interactions</li>
                    <li>• Using multiple t-tests instead of ANOVA</li>
                    <li>• Not checking assumptions</li>
                    <li>• Confusing statistical vs. practical significance</li>
                  </ul>
                </div>
              </div>
            </div>
  
            <Separator />
  
            {/* Decision Tree */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Quick Decision Guide
              </h3>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <p><strong>Interaction significant?</strong> → Yes: Interpret specific combinations via simple main effects or post-hoc. 
                    Main effects may be misleading.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <p><strong>Interaction not significant?</strong> → Interpret main effects independently. 
                    Run post-hoc tests if factors have &gt;2 levels.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <p><strong>Homogeneity violated?</strong> → Use Games-Howell post-hoc instead of Tukey HSD 
                    (automatically recommended by this tool).</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">4</div>
                    <p><strong>No significant effects?</strong> → Factors don't reliably influence the outcome. 
                    Consider other variables or check for data quality issues.</p>
                  </div>
                </div>
              </div>
            </div>
  
            {/* Footer Note */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Note on Statistical Significance:</strong> A significant p-value 
                (p &lt; .05) tells you the effect is unlikely due to chance, but doesn't measure importance. 
                Always report <strong>effect sizes (η²p)</strong> to quantify practical significance. A large sample 
                can make trivial differences "significant," while a small sample may miss real effects.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  

// Python Code Modal Component
const PythonCodeModal = ({ 
    isOpen, 
    onClose, 
    codeUrl,
    title = "Python Code - Two-Way ANOVA"
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    codeUrl: string;
    title?: string;
}) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !code) {
            fetchCode();
        }
    }, [isOpen]);

    const fetchCode = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch(codeUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch code: ${response.status}`);
            }
            const text = await response.text();
            setCode(text);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load Python code';
            setError(errorMessage);
            toast({ 
                variant: 'destructive', 
                title: 'Error', 
                description: 'Failed to load Python code' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Copied!', description: 'Code copied to clipboard' });
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/x-python' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'two_way_anova.py';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast({ title: 'Downloaded!', description: 'Python file saved' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Code className="w-5 h-5 text-primary" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        View, copy, or download the Python code used for this analysis.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex gap-2 py-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCopy} 
                        disabled={isLoading || !!error}
                    >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Code
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownload} 
                        disabled={isLoading || !!error}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download .py
                    </Button>
                    {error && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchCode}
                        >
                            <Loader2 className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                    )}
                </div>
                
                <div className="flex-1 min-h-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64 bg-slate-950 rounded-lg">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-3 text-slate-300">Loading code...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-slate-950 rounded-lg text-center">
                            <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
                            <p className="text-slate-300 mb-2">Failed to load code</p>
                            <p className="text-slate-500 text-sm">{error}</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[50vh] w-full rounded-lg border bg-slate-950">
                            <pre className="p-4 text-sm text-slate-50 overflow-x-auto">
                                <code className="language-python">{code}</code>
                            </pre>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const TwoWayAnovaGlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Two-Way ANOVA Statistical Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms and concepts used in factorial analysis of variance
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(twoWayAnovaMetricDefinitions).map(([term, definition]) => (
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

// ============================================
// TYPE DEFINITIONS (Updated for new backend)
// ============================================

interface AnovaRow {
    Source: string;
    sum_sq: number;
    df: number;
    MS: number;
    F: number;
    p_value: number;
    partial_eta_sq: number;
    partial_omega_sq: number;
}

interface CellDescriptive {
    n: number;
    mean: number;
    std: number;
    se: number;
    ci_lower: number;
    ci_upper: number;
    min: number;
    max: number;
}

interface MarginalMean {
    group: string;
    n: number;
    mean: number;
    std: number;
    se: number;
    ci_lower: number;
    ci_upper: number;
}

interface NormalityResult {
    statistic: number | null;
    p_value: number | null;
    normal: boolean | null;
}

interface HomogeneityTest {
    statistic: number | null;
    df1?: number;
    df2?: number;
    p_value: number | null;
    equal_variances: boolean | null;
}

interface PostHocResult {
    group1: string;
    group2: string;
    meandiff: number;
    se?: number;
    df?: number;
    t_stat?: number;
    p_adj: number;
    lower?: number;
    upper?: number;
    ci_lower?: number;
    ci_upper?: number;
    reject: boolean;
}

interface PostHocResults {
    tukey: PostHocResult[];
    games_howell: PostHocResult[];
}

interface SimpleMainEffect {
    effect: string;
    factor_varied: string;
    factor_fixed: string;
    fixed_level: string;
    f_statistic: number;
    p_value: number;
    eta_squared: number;
    omega_squared: number;
    significant: boolean;
}

interface TwoWayAnovaResults {
    anova_table: AnovaRow[];
    ss_type: number;
    cell_descriptives: { [key: string]: CellDescriptive };
    descriptive_stats_table: {
        mean: { [key: string]: { [key: string]: number } };
        std: { [key: string]: { [key: string]: number } };
    };
    marginal_means: {
        factor_a: MarginalMean[];
        factor_b: MarginalMean[];
    };
    assumptions: {
        normality: { [key: string]: NormalityResult };
        homogeneity: {
            levene: HomogeneityTest;
            brown_forsythe: HomogeneityTest;
        };
    };
    simple_main_effects: SimpleMainEffect[] | null;
    posthoc: {
        interaction: PostHocResults | null;
        factor_a: PostHocResults | null;
        factor_b: PostHocResults | null;
        recommended: 'tukey' | 'games_howell';
    };
    significance: {
        factor_a: boolean;
        factor_b: boolean;
        interaction: boolean;
    };
    interpretation: string;
    dropped_rows: number[];
    n_dropped: number;
    n_used: number;
    n_original: number;
}

interface FullAnalysisResponse {
    results: TwoWayAnovaResults;
    plot: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const getEffectSizeInterpretation = (eta: number) => {
    if (eta >= 0.14) return 'Large';
    if (eta >= 0.06) return 'Medium';
    if (eta >= 0.01) return 'Small';
    return 'Negligible';
};

const getSignificanceStars = (p: number | undefined | null) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const formatPValue = (p: number | undefined | null) => {
    if (p === undefined || p === null) return 'N/A';
    if (p < 0.001) return '<.001';
    return p.toFixed(4);
};

const getDescValue = (
    data: { mean: { [key: string]: { [key: string]: number } }; std: { [key: string]: { [key: string]: number } } } | undefined,
    stat: 'mean' | 'std',
    row: string,
    col: string
): number | undefined => {
    if (!data || !data[stat] || !data[stat][row]) return undefined;
    const rowData = data[stat][row];
    if (typeof rowData === 'object' && rowData !== null) {
        return rowData[col];
    }
    return undefined;
};

// ============================================
// INTRO PAGE
// ============================================

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const anovaExample = exampleDatasets.find(d => d.id === 'two-way-anova');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Users className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Two-Way ANOVA</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Examine effects of two factors and their interaction on a continuous outcome
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Layers className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Two Factors</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Analyze effects of two independent categorical variables simultaneously
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Interaction Effects</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Discover if the effect of one factor depends on the other
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChartIcon className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Robust Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Games-Howell for unequal variances, Type III SS
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use Two-Way ANOVA to test effects of two categorical factors on a continuous outcome.
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
                                        <span><strong>Dependent variable:</strong> Continuous numeric</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Two factors:</strong> Different categorical variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Cell size:</strong> At least 3 per combination</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    What You'll Get
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Effect sizes:</strong> η²p and ω²p</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Post-hoc:</strong> Tukey HSD + Games-Howell</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Simple effects:</strong> When interaction is significant</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {anovaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(anovaExample)} size="lg">
                                <Users className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

interface TwoWayAnovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function TwoWayAnovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: TwoWayAnovaPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    // View & Step State
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    // Variable Selection
    const [dependentVar, setDependentVar] = useState('');
    const [factorA, setFactorA] = useState('');
    const [factorB, setFactorB] = useState('');
    const [ssType, setSsType] = useState<number>(3);

    // Results State
    const [analysisResponse, setAnalysisResponse] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false); 
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false); // 👈 이 줄 추가

    // Computed Values
    const canRun = useMemo(() => 
        data.length > 0 && numericHeaders.length > 0 && categoricalHeaders.length >= 2,
        [data, numericHeaders, categoricalHeaders]
    );
    
    const availableFactorB = useMemo(() => 
        categoricalHeaders.filter(h => h !== factorA),
        [categoricalHeaders, factorA]
    );

    const levelsA = useMemo(() => 
        factorA ? new Set(data.map(row => row[factorA]).filter(v => v != null)).size : 0,
        [data, factorA]
    );
    
    const levelsB = useMemo(() => 
        factorB ? new Set(data.map(row => row[factorB]).filter(v => v != null)).size : 0,
        [data, factorB]
    );

    const dataValidation = useMemo(() => {
        const totalCells = levelsA * levelsB;
        const avgPerCell = totalCells > 0 ? Math.floor(data.length / totalCells) : 0;
        return [
            { label: 'Dependent variable selected', passed: dependentVar !== '', detail: dependentVar || 'Select DV' },
            { label: 'Factor A selected', passed: factorA !== '', detail: factorA ? `${factorA} (${levelsA} levels)` : 'Select Factor A' },
            { label: 'Factor B selected', passed: factorB !== '', detail: factorB ? `${factorB} (${levelsB} levels)` : 'Select Factor B' },
            { label: 'Factors are different', passed: factorA !== factorB && factorA !== '' && factorB !== '', detail: factorA === factorB ? 'Factors must differ' : 'OK' },
            { label: 'Adequate cell size', passed: avgPerCell >= 3, detail: `~${avgPerCell} observations per cell` },
            { label: 'Sufficient sample size', passed: data.length >= 20, detail: `n = ${data.length}` }
        ];
    }, [dependentVar, factorA, factorB, levelsA, levelsB, data]);

    const allValidationsPassed = useMemo(() => 
        dataValidation.slice(0, 4).every(c => c.passed),
        [dataValidation]
    );

    // Results shortcuts
    const results = analysisResponse?.results;
    
    const interactionRow = useMemo(() => 
        results?.anova_table.find(row => row.Source.includes('*') || row.Source.includes(':')),
        [results]
    );
    
    const factorARow = useMemo(() => 
        results?.anova_table.find(row => 
            !row.Source.includes('*') && 
            !row.Source.includes(':') && 
            !row.Source.includes('Residual') &&
            row.Source === factorA
        ),
        [results, factorA]
    );
    
    const factorBRow = useMemo(() => 
        results?.anova_table.find(row => 
            !row.Source.includes('*') && 
            !row.Source.includes(':') && 
            !row.Source.includes('Residual') &&
            row.Source === factorB
        ),
        [results, factorB]
    );

    const isInteractionSig = results?.significance?.interaction ?? false;
    const isFactorASig = results?.significance?.factor_a ?? false;
    const isFactorBSig = results?.significance?.factor_b ?? false;
    const variancesEqual = results?.assumptions?.homogeneity?.brown_forsythe?.equal_variances ?? true;
    const recommendedPostHoc = results?.posthoc?.recommended ?? 'tukey';

    // Effects
    useEffect(() => {
        if (data.length === 0 || !canRun) {
            setView('intro');
        } else {
            setDependentVar(numericHeaders[0] || '');
            setFactorA(categoricalHeaders[0] || '');
            setFactorB(categoricalHeaders[1] || '');
            setView('main');
            setAnalysisResponse(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, categoricalHeaders, canRun]);

    // Navigation
    const goToStep = (step: Step) => {
        setCurrentStep(step);
        if (step > maxReachedStep) setMaxReachedStep(step);
    };
    const nextStep = () => { if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    // Download Handlers
    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Two_Way_ANOVA_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL();
            link.click();
            toast({ title: "Download complete" });
        } catch {
            toast({ variant: 'destructive', title: 'Download failed' });
        } finally {
            setIsDownloading(false);
        }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResponse?.results) return;
        const r = analysisResponse.results;
        let csv = `TWO-WAY ANOVA (Type ${r.ss_type} SS)\n`;
        csv += `DV: ${dependentVar}\nFactor A: ${factorA}\nFactor B: ${factorB}\n\n`;
        csv += "ANOVA TABLE\n";
        csv += Papa.unparse(r.anova_table.map(row => ({
            Source: row.Source,
            SS: row.sum_sq,
            df: row.df,
            MS: row.MS,
            F: row.F,
            p: row.p_value,
            partial_eta_sq: row.partial_eta_sq,
            partial_omega_sq: row.partial_omega_sq
        }))) + "\n\n";
        
        // Cell descriptives
        if (r.cell_descriptives) {
            csv += "CELL DESCRIPTIVES\n";
            csv += Papa.unparse(Object.entries(r.cell_descriptives).map(([cell, stats]) => ({
                cell,
                ...stats
            }))) + "\n";
        }
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Two_Way_ANOVA_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }, [analysisResponse, dependentVar, factorA, factorB]);

    // Analysis Handler
    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || !factorA || !factorB || factorA === factorB) {
            toast({ variant: 'destructive', title: 'Check variable selection' });
            return;
        }
        
        setIsLoading(true);
        setAnalysisResponse(null);
        
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/two-way-anova`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, factorA, factorB, ssType })
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || err.error || 'Failed');
            }
            
            setAnalysisResponse(await res.json());
            goToStep(4);
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            toast({ variant: 'destructive', title: 'Error', description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, factorA, factorB, ssType, toast]);

    // Render Intro if needed
    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    // Progress Bar Component
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
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2 ${
                                isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' :
                                isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' :
                                'bg-background border-muted-foreground/30 text-muted-foreground'
                            }`}>
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

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <TwoWayAnovaGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
        <TwoWayAnovaGlossaryModal 
            isOpen={glossaryModalOpen}
            onClose={() => setGlossaryModalOpen(false)}
        />
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Two-Way ANOVA</h1>
                    <p className="text-muted-foreground mt-1">Factorial Analysis of Variance</p>
                </div>
                <div className="flex gap-2">
          {/* 📘 실용 가이드 - 초보자용 */}
          <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
            <BookOpen className="w-4 h-4 mr-2" />
            Analysis Guide
          </Button>
          {/* 📖 통계 용어집 - 참고용 */}
          <Button variant="ghost" size="sm" onClick={() => setGlossaryModalOpen(true)}>
            <HelpCircle className="w-4 h-4 mr-2" />
          </Button>
           </div>
        </div>
            
            <ProgressBar />
            
            <div className="min-h-[500px]">
                {/* Step 1: Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Select Variables</CardTitle>
                                    <CardDescription>Choose dependent variable and two factors</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Dependent Variable (Numeric)</Label>
                                    <Select value={dependentVar} onValueChange={setDependentVar}>
                                        <SelectTrigger><SelectValue placeholder="Select DV" /></SelectTrigger>
                                        <SelectContent>
                                            {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Factor A (Categorical)</Label>
                                    <Select value={factorA} onValueChange={setFactorA}>
                                        <SelectTrigger><SelectValue placeholder="Select Factor A" /></SelectTrigger>
                                        <SelectContent>
                                            {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {levelsA > 0 && <Badge variant="outline">{levelsA} levels</Badge>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Factor B (Categorical)</Label>
                                    <Select value={factorB} onValueChange={setFactorB}>
                                        <SelectTrigger><SelectValue placeholder="Select Factor B" /></SelectTrigger>
                                        <SelectContent>
                                            {availableFactorB.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {levelsB > 0 && <Badge variant="outline">{levelsB} levels</Badge>}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                    Sample size: <span className="font-semibold text-foreground">{data.length}</span> | 
                                    Design: {levelsA} × {levelsB} = {levelsA * levelsB} cells
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button onClick={nextStep} className="ml-auto" size="lg">
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
                                    <CardTitle>Analysis Settings</CardTitle>
                                    <CardDescription>Configure analysis options</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Dependent Variable:</strong> {dependentVar}</p>
                                    <p>• <strong className="text-foreground">Factor A:</strong> {factorA} ({levelsA} levels)</p>
                                    <p>• <strong className="text-foreground">Factor B:</strong> {factorB} ({levelsB} levels)</p>
                                    <p>• <strong className="text-foreground">Design:</strong> {levelsA} × {levelsB} factorial</p>
                                    <p>• <strong className="text-foreground">Sum of Squares:</strong> Type {ssType} (recommended for unbalanced designs)</p>
                                    <p>• <strong className="text-foreground">Post-hoc:</strong> Tukey HSD + Games-Howell</p>
                                    <p>• <strong className="text-foreground">Effect Sizes:</strong> η²p (partial eta-squared) + ω²p (partial omega-squared)</p>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Sum of Squares Type</Label>
                                <Select value={ssType.toString()} onValueChange={(v) => setSsType(parseInt(v))}>
                                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Type I (Sequential)</SelectItem>
                                        <SelectItem value="2">Type II (Hierarchical)</SelectItem>
                                        <SelectItem value="3">Type III (Recommended)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">Type III is recommended for unbalanced designs (SPSS default)</p>
                            </div>
                            
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-sky-600" />
                                    About This Analysis
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Two-Way ANOVA tests main effects of {factorA} and {factorB}, plus their interaction effect on {dependentVar}. 
                                    Both Tukey HSD (equal variances) and Games-Howell (unequal variances) post-hoc tests are provided, 
                                    with automatic recommendation based on Brown-Forsythe test.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                            <Button onClick={nextStep} size="lg">
                                Next<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 3: Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Shield className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Data Validation</CardTitle>
                                    <CardDescription>Checking requirements</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {dataValidation.map((c, i) => (
                                    <div key={i} className={`flex items-start gap-4 p-4 rounded-xl ${c.passed ? 'bg-primary/5' : 'bg-red-50/50 dark:bg-red-950/20'}`}>
                                        {c.passed ? 
                                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : 
                                            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                        }
                                        <div>
                                            <p className={`font-medium text-sm ${c.passed ? 'text-foreground' : 'text-red-700 dark:text-red-300'}`}>{c.label}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{c.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                            <Button onClick={handleAnalysis} disabled={isLoading || !allValidationsPassed} size="lg">
                                {isLoading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</>
                                ) : (
                                    <><Play className="mr-2 h-4 w-4" />Run ANOVA</>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Loading State */}
                {isLoading && (
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Running Two-Way ANOVA...</p>
                            <Skeleton className="h-[300px] w-full" />
                        </CardContent>
                    </Card>
                )}

                {/* ============================================
                    PART 2 STARTS HERE (Steps 4-6)
                    These will be added in the next file
                    ============================================ */}
                
                {/* Step 4: Summary */}
                {currentStep === 4 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Result Summary</CardTitle>
                                    <CardDescription>{dependentVar} by {factorA} × {factorB}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Key Findings */}
                            <div className={`rounded-xl p-6 space-y-4 border ${isInteractionSig || isFactorASig || isFactorBSig ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Sparkles className={`w-5 h-5 ${isInteractionSig || isFactorASig || isFactorBSig ? 'text-primary' : 'text-amber-600'}`} />
                                    Key Findings
                                </h3>
                                <div className="space-y-3">
                                    {isInteractionSig ? (
                                        <>
                                            <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">
                                                <strong className="text-foreground">Significant interaction found!</strong> The effect of {factorA} on {dependentVar} <strong>depends on</strong> the level of {factorB}.
                                            </p></div>
                                            <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">
                                                This means you should look at specific combinations rather than overall main effects.
                                            </p></div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-start gap-3"><span className={`font-bold ${isFactorASig || isFactorBSig ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                                No significant interaction — {factorA} and {factorB} have <strong>independent effects</strong> on {dependentVar}.
                                            </p></div>
                                            {isFactorASig && <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">
                                                <strong className="text-foreground">{factorA}</strong> has a significant main effect ({getEffectSizeInterpretation(factorARow?.partial_eta_sq || 0).toLowerCase()} effect).
                                            </p></div>}
                                            {isFactorBSig && <div className="flex items-start gap-3"><span className="font-bold text-primary">•</span><p className="text-sm">
                                                <strong className="text-foreground">{factorB}</strong> has a significant main effect ({getEffectSizeInterpretation(factorBRow?.partial_eta_sq || 0).toLowerCase()} effect).
                                            </p></div>}
                                            {!isFactorASig && !isFactorBSig && <div className="flex items-start gap-3"><span className="font-bold text-amber-600">•</span><p className="text-sm">
                                                Neither factor shows a significant effect on {dependentVar}.
                                            </p></div>}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Conclusion Card */}
                            <div className={`rounded-xl p-5 border ${isInteractionSig || isFactorASig || isFactorBSig ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <div className="flex items-start gap-3">
                                    {isInteractionSig || isFactorASig || isFactorBSig ? (
                                        <CheckCircle2 className="w-6 h-6 text-primary" />
                                    ) : (
                                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                                    )}
                                    <div>
                                        <p className="font-semibold">
                                            {isInteractionSig 
                                                ? "Interaction Effect Confirmed!" 
                                                : (isFactorASig || isFactorBSig) 
                                                    ? "Main Effect(s) Confirmed!" 
                                                    : "No Significant Effects"}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {isInteractionSig 
                                                ? "Different strategies may be needed for specific factor combinations." 
                                                : (isFactorASig || isFactorBSig) 
                                                    ? "Examine post-hoc tests to identify which levels differ." 
                                                    : "The factors do not appear to influence the outcome."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Variance Warning */}
                            {!variancesEqual && (
                                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 border border-amber-300 dark:border-amber-700">
                                    <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Unequal variances detected (Brown-Forsythe p = {results.assumptions?.homogeneity?.brown_forsythe?.p_value?.toFixed(3)}). Games-Howell post-hoc test is recommended.
                                    </p>
                                </div>
                            )}

                            {/* Evidence Section */}
                            <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-slate-600" />
                                    Evidence
                                </h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong>Interaction ({factorA} × {factorB}):</strong> p = {formatPValue(interactionRow?.p_value)} — {isInteractionSig ? `The effect of ${factorA} changes depending on ${factorB}.` : `${factorA} and ${factorB} work independently.`}</p>
                                    <p>• <strong>{factorA}:</strong> p = {formatPValue(factorARow?.p_value)} — {isFactorASig ? `${factorA} has a real effect on ${dependentVar}.` : `No clear effect from ${factorA}.`}</p>
                                    <p>• <strong>{factorB}:</strong> p = {formatPValue(factorBRow?.p_value)} — {isFactorBSig ? `${factorB} has a real effect on ${dependentVar}.` : `No clear effect from ${factorB}.`}</p>
                                </div>
                            </div>

                            {/* Effect Quality Stars */}
                            <div className="flex items-center justify-center gap-1 py-2">
                                <span className="text-sm text-muted-foreground mr-2">Overall Effect:</span>
                                {[1, 2, 3, 4, 5].map(star => {
                                    const maxEta = Math.max(interactionRow?.partial_eta_sq || 0, factorARow?.partial_eta_sq || 0, factorBRow?.partial_eta_sq || 0);
                                    const score = maxEta >= 0.14 ? 5 : maxEta >= 0.10 ? 4 : maxEta >= 0.06 ? 3 : maxEta >= 0.01 ? 2 : 1;
                                    return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;
                                })}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end">
                            <Button onClick={nextStep} size="lg">
                                Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Lightbulb className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Why This Conclusion?</CardTitle>
                                    <CardDescription>Understanding Two-Way ANOVA results</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* 1. How Two-Way ANOVA Works */}
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">How Two-Way ANOVA Works</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Two-Way ANOVA partitions variance into: (1) <strong className="text-foreground">{factorA} main effect</strong>, 
                                            (2) <strong className="text-foreground">{factorB} main effect</strong>, 
                                            (3) <strong className="text-foreground">interaction effect</strong>, and (4) residual error.
                                            Each F-ratio tests whether that source explains significant variance.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Assumption Checks */}
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                                    <div className="w-full">
                                        <h4 className="font-semibold mb-2">Assumption Checks</h4>
                                        <div className="space-y-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                {variancesEqual ? (
                                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                                ) : (
                                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                )}
                                                <span>
                                                    <strong className="text-foreground">Homogeneity of Variance:</strong> {variancesEqual 
                                                        ? `Equal variances confirmed (Brown-Forsythe p = ${results.assumptions?.homogeneity?.brown_forsythe?.p_value?.toFixed(3)} > .05). Standard analysis is appropriate.`
                                                        : `Unequal variances detected (Brown-Forsythe p = ${results.assumptions?.homogeneity?.brown_forsythe?.p_value?.toFixed(3)} < .05). Games-Howell post-hoc is recommended.`}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Info className="w-4 h-4 text-blue-600" />
                                                <span>
                                                    <strong className="text-foreground">SS Type {results.ss_type}:</strong> Tests each effect controlling for all others (appropriate for unbalanced designs).
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Interaction Effect */}
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Interaction Effect Interpretation</h4>
                                        <p className="text-sm text-muted-foreground">
                                            <strong className="text-foreground">F = {interactionRow?.F?.toFixed(2)}, p = {formatPValue(interactionRow?.p_value)}</strong> — 
                                            {isInteractionSig 
                                                ? ` Significant! The effect of ${factorA} on ${dependentVar} depends on the level of ${factorB}. Main effects should be interpreted with caution.`
                                                : ` Not significant. The effects of ${factorA} and ${factorB} are additive and can be interpreted independently.`
                                            }
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            <strong className="text-foreground">η²p = {interactionRow?.partial_eta_sq?.toFixed(3)}</strong> — 
                                            The interaction explains {((interactionRow?.partial_eta_sq || 0) * 100).toFixed(1)}% of variance ({getEffectSizeInterpretation(interactionRow?.partial_eta_sq || 0).toLowerCase()} effect).
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Main Effects */}
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Main Effects</h4>
                                        <div className="text-sm text-muted-foreground space-y-2">
                                            <p>
                                                <strong className="text-foreground">{factorA}:</strong> F = {factorARow?.F?.toFixed(2)}, p = {formatPValue(factorARow?.p_value)}, 
                                                η²p = {factorARow?.partial_eta_sq?.toFixed(3)}, ω²p = {factorARow?.partial_omega_sq?.toFixed(3)} 
                                                — {isFactorASig ? `Significant ${getEffectSizeInterpretation(factorARow?.partial_eta_sq || 0).toLowerCase()} effect.` : 'Not significant.'}
                                            </p>
                                            <p>
                                                <strong className="text-foreground">{factorB}:</strong> F = {factorBRow?.F?.toFixed(2)}, p = {formatPValue(factorBRow?.p_value)}, 
                                                η²p = {factorBRow?.partial_eta_sq?.toFixed(3)}, ω²p = {factorBRow?.partial_omega_sq?.toFixed(3)} 
                                                — {isFactorBSig ? `Significant ${getEffectSizeInterpretation(factorBRow?.partial_eta_sq || 0).toLowerCase()} effect.` : 'Not significant.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Post-hoc Tests */}
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">5</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Post-hoc Comparisons</h4>
                                        <p className="text-sm text-muted-foreground">
                                            <strong className="text-foreground">Recommended test:</strong> {variancesEqual ? "Tukey's HSD (equal variances)" : "Games-Howell (unequal variances)"}.
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {isInteractionSig && "• Interaction post-hoc: Compare specific cell combinations."}
                                            {(isFactorASig && levelsA > 2) && ` • ${factorA} post-hoc: Compare levels of ${factorA}.`}
                                            {(isFactorBSig && levelsB > 2) && ` • ${factorB} post-hoc: Compare levels of ${factorB}.`}
                                            {!isInteractionSig && !isFactorASig && !isFactorBSig && "No significant effects require post-hoc testing."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Line */}
                            <div className={`rounded-xl p-5 border ${isInteractionSig || isFactorASig || isFactorBSig ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                    <h4 className="font-semibold">Bottom Line</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {isInteractionSig 
                                        ? `The effect of ${factorA} on ${dependentVar} depends on the level of ${factorB}. Look at specific combinations to understand the pattern.`
                                        : (isFactorASig && isFactorBSig)
                                            ? `Both ${factorA} and ${factorB} independently affect ${dependentVar}. Each factor can be examined separately.`
                                            : isFactorASig
                                                ? `${factorA} has a significant effect on ${dependentVar}, while ${factorB} does not.`
                                                : isFactorBSig
                                                    ? `${factorB} has a significant effect on ${dependentVar}, while ${factorA} does not.`
                                                    : `Neither ${factorA} nor ${factorB} shows a significant effect on ${dependentVar}.`
                                    }
                                </p>
                            </div>

                            {/* Effect Size Guide */}
                            <div className="bg-muted/20 rounded-xl p-4">
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4" />
                                    Effect Size Guide (η²p)
                                </h4>
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                    <div className="text-center p-2 bg-background rounded-lg">
                                        <p className="font-medium">&lt; 0.01</p>
                                        <p className="text-muted-foreground">Negligible</p>
                                    </div>
                                    <div className="text-center p-2 bg-background rounded-lg">
                                        <p className="font-medium">0.01-0.06</p>
                                        <p className="text-muted-foreground">Small</p>
                                    </div>
                                    <div className="text-center p-2 bg-background rounded-lg">
                                        <p className="font-medium">0.06-0.14</p>
                                        <p className="text-muted-foreground">Medium</p>
                                    </div>
                                    <div className="text-center p-2 bg-background rounded-lg">
                                        <p className="font-medium">&gt; 0.14</p>
                                        <p className="text-muted-foreground">Large</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                            <Button onClick={nextStep} size="lg">
                                Full Report<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && results && analysisResponse && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-semibold">Full Statistics</h2>
                            <p className="text-sm text-muted-foreground">Complete Two-Way ANOVA report (Type {results.ss_type} SS)</p>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}>
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                    PNG
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                                    <Code className="mr-2 h-4 w-4" />Python Code
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    
                    <div ref={resultsRef} className="space-y-4 bg-background p-4 rounded-lg">
                        {/* Header */}
                        <div className="text-center py-4 border-b">
                            <h2 className="text-2xl font-bold">Two-Way ANOVA Report</h2>
                            <p className="text-sm text-muted-foreground">
                                DV: {dependentVar} | {factorA} × {factorB} | Type {results.ss_type} SS | {new Date().toLocaleDateString()}
                            </p>
                        </div>
                        
                        {/* Summary Cards - 원본 디자인 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-muted-foreground">Interaction</p>
                                            <Layers className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <p className="text-2xl font-semibold">{formatPValue(interactionRow?.p_value)}</p>
                                        <p className="text-xs text-muted-foreground">{isInteractionSig ? 'Significant' : 'Not Significant'}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-muted-foreground">{factorA}</p>
                                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <p className="text-2xl font-semibold">{formatPValue(factorARow?.p_value)}</p>
                                        <p className="text-xs text-muted-foreground">{isFactorASig ? 'Significant' : 'Not Significant'}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-muted-foreground">{factorB}</p>
                                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <p className="text-2xl font-semibold">{formatPValue(factorBRow?.p_value)}</p>
                                        <p className="text-xs text-muted-foreground">{isFactorBSig ? 'Significant' : 'Not Significant'}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-muted-foreground">η²p (Interaction)</p>
                                            <Target className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <p className="text-2xl font-semibold">{interactionRow?.partial_eta_sq?.toFixed(3) ?? 'N/A'}</p>
                                        <p className="text-xs text-muted-foreground">{getEffectSizeInterpretation(interactionRow?.partial_eta_sq || 0)} effect</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-muted-foreground">ω²p (Interaction)</p>
                                            <Target className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <p className="text-2xl font-semibold">{interactionRow?.partial_omega_sq?.toFixed(3) ?? 'N/A'}</p>
                                        <p className="text-xs text-muted-foreground">Unbiased effect</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detailed Analysis */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sigma className="h-5 w-5" />
                                    Detailed Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-primary/10 rounded-md">
                                            <BookOpen className="h-4 w-4 text-primary" />
                                        </div>
                                        <h3 className="font-semibold text-base">Statistical Summary</h3>
                                    </div>
                                    <div className="text-sm text-foreground/80 leading-relaxed">
                                        {results.interpretation}
                                    </div>
                                </div>

                                {/* Variance Warning */}
                                {!variancesEqual && (
                                    <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-300 dark:border-amber-700">
                                        <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            <strong>Note:</strong> Homogeneity of variances assumption was violated (Brown-Forsythe p = {results.assumptions.homogeneity.brown_forsythe.p_value?.toFixed(3)}). 
                                            Games-Howell post-hoc test is recommended.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Visualization */}
                        <Card>
                            <CardHeader><CardTitle>Visualization</CardTitle></CardHeader>
                            <CardContent>
                                <Image 
                                    src={analysisResponse.plot} 
                                    alt="Two-Way ANOVA Plots" 
                                    width={1500} 
                                    height={1200} 
                                    className="w-3/4 mx-auto rounded border" 
                                />
                            </CardContent>
                        </Card>

                        {/* ANOVA Table */}
                        <Card>
                            <CardHeader><CardTitle>ANOVA Table (Type {results.ss_type} SS)</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Source</TableHead>
                                            <TableHead className="text-right">SS</TableHead>
                                            <TableHead className="text-right">df</TableHead>
                                            <TableHead className="text-right">MS</TableHead>
                                            <TableHead className="text-right">F</TableHead>
                                            <TableHead className="text-right">p</TableHead>
                                            <TableHead className="text-right">η²p</TableHead>
                                            <TableHead className="text-right">ω²p</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.anova_table.map((row, i) => (
                                            <TableRow key={i} className={row.Source.includes('Residual') ? 'bg-muted/30' : ''}>
                                                <TableCell className="font-medium">{row.Source}</TableCell>
                                                <TableCell className="text-right font-mono">{row.sum_sq?.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{row.df}</TableCell>
                                                <TableCell className="text-right font-mono">{row.MS?.toFixed(3) || '—'}</TableCell>
                                                <TableCell className="text-right font-mono">{row.F?.toFixed(3) || '—'}</TableCell>
                                                <TableCell className="text-right">
                                                    {row.p_value !== undefined && row.p_value !== null ? (
                                                        <Badge variant={row.p_value <= 0.05 ? 'default' : 'outline'}>
                                                            {formatPValue(row.p_value)}{getSignificanceStars(row.p_value)}
                                                        </Badge>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">{row.partial_eta_sq?.toFixed(3) || '—'}</TableCell>
                                                <TableCell className="text-right font-mono">{row.partial_omega_sq?.toFixed(3) || '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter>
                                <p className="text-sm text-muted-foreground">*** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05</p>
                            </CardFooter>
                        </Card>

                        {/* Cell Descriptives with 95% CI */}
                        {results.cell_descriptives && Object.keys(results.cell_descriptives).length > 0 && (
                            <Card>
                                <CardHeader><CardTitle>Cell Descriptives (95% CI)</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Cell</TableHead>
                                                <TableHead className="text-right">N</TableHead>
                                                <TableHead className="text-right">Mean</TableHead>
                                                <TableHead className="text-right">SD</TableHead>
                                                <TableHead className="text-right">SE</TableHead>
                                                <TableHead className="text-right">95% CI</TableHead>
                                                <TableHead className="text-right">Min</TableHead>
                                                <TableHead className="text-right">Max</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(results.cell_descriptives).map(([cell, stats]) => (
                                                <TableRow key={cell}>
                                                    <TableCell className="font-medium">{cell}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.std.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.se.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">[{stats.ci_lower.toFixed(2)}, {stats.ci_upper.toFixed(2)}]</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.min.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.max.toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Marginal Means */}
                        {results.marginal_means && (
                            <Card>
                                <CardHeader><CardTitle>Marginal Means</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Factor A */}
                                    <div>
                                        <h4 className="font-semibold text-sm mb-3">{factorA}</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Level</TableHead>
                                                    <TableHead className="text-right">N</TableHead>
                                                    <TableHead className="text-right">Mean</TableHead>
                                                    <TableHead className="text-right">SD</TableHead>
                                                    <TableHead className="text-right">SE</TableHead>
                                                    <TableHead className="text-right">95% CI</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.marginal_means.factor_a.map((row, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="font-medium">{row.group}</TableCell>
                                                        <TableCell className="text-right font-mono">{row.n}</TableCell>
                                                        <TableCell className="text-right font-mono">{row.mean?.toFixed(3)}</TableCell>
                                                        <TableCell className="text-right font-mono">{row.std?.toFixed(3)}</TableCell>
                                                        <TableCell className="text-right font-mono">{row.se?.toFixed(3)}</TableCell>
                                                        <TableCell className="text-right font-mono">[{row.ci_lower?.toFixed(2)}, {row.ci_upper?.toFixed(2)}]</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    
                                    {/* Factor B */}
                                    <div>
                                        <h4 className="font-semibold text-sm mb-3">{factorB}</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Level</TableHead>
                                                    <TableHead className="text-right">N</TableHead>
                                                    <TableHead className="text-right">Mean</TableHead>
                                                    <TableHead className="text-right">SD</TableHead>
                                                    <TableHead className="text-right">SE</TableHead>
                                                    <TableHead className="text-right">95% CI</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.marginal_means.factor_b.map((row, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="font-medium">{row.group}</TableCell>
                                                        <TableCell className="text-right font-mono">{row.n}</TableCell>
                                                        <TableCell className="text-right font-mono">{row.mean?.toFixed(3)}</TableCell>
                                                        <TableCell className="text-right font-mono">{row.std?.toFixed(3)}</TableCell>
                                                        <TableCell className="text-right font-mono">{row.se?.toFixed(3)}</TableCell>
                                                        <TableCell className="text-right font-mono">[{row.ci_lower?.toFixed(2)}, {row.ci_upper?.toFixed(2)}]</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Simple Main Effects */}
                        {results.simple_main_effects && results.simple_main_effects.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        Simple Main Effects
                                        <Badge variant="secondary" className="text-xs">Interaction significant</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Effect</TableHead>
                                                <TableHead className="text-right">F</TableHead>
                                                <TableHead className="text-right">p</TableHead>
                                                <TableHead className="text-right">η²</TableHead>
                                                <TableHead className="text-right">ω²</TableHead>
                                                <TableHead className="text-center">Sig.</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.simple_main_effects.map((e, i) => (
                                                <TableRow key={i} className={e.significant ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                                                    <TableCell className="font-medium">{e.effect}</TableCell>
                                                    <TableCell className="text-right font-mono">{e.f_statistic?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={e.significant ? 'default' : 'outline'}>
                                                            {formatPValue(e.p_value)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">{e.eta_squared?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{e.omega_squared?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-center">
                                                        {e.significant ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Post-hoc Tests */}
                        {results.posthoc && (results.posthoc.interaction || results.posthoc.factor_a || results.posthoc.factor_b) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        Post-hoc Tests
                                        <Badge variant="secondary" className="text-xs">
                                            Recommended: {recommendedPostHoc === 'games_howell' ? 'Games-Howell' : "Tukey's HSD"}
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Interaction Post-hoc */}
                                    {results.posthoc.interaction && (
                                        <div>
                                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                                Interaction (Cell Comparisons)
                                            </h4>
                                            
                                            {/* Tukey for Interaction */}
                                            {results.posthoc.interaction.tukey && results.posthoc.interaction.tukey.length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                                        Tukey HSD
                                                        {recommendedPostHoc === 'tukey' && <Badge variant="default" className="text-xs ml-2">Recommended</Badge>}
                                                    </p>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Group 1</TableHead>
                                                                <TableHead>Group 2</TableHead>
                                                                <TableHead className="text-right">Mean Diff</TableHead>
                                                                <TableHead className="text-right">95% CI</TableHead>
                                                                <TableHead className="text-right">p-adj</TableHead>
                                                                <TableHead className="text-center">Sig.</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {results.posthoc.interaction.tukey.slice(0, 15).map((r, i) => (
                                                                <TableRow key={i} className={r.reject ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                                                                    <TableCell className="text-sm">{r.group1}</TableCell>
                                                                    <TableCell className="text-sm">{r.group2}</TableCell>
                                                                    <TableCell className="text-right font-mono">{r.meandiff?.toFixed(3)}</TableCell>
                                                                    <TableCell className="text-right font-mono">[{r.lower?.toFixed(2)}, {r.upper?.toFixed(2)}]</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Badge variant={r.reject ? 'default' : 'outline'}>{formatPValue(r.p_adj)}</Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">{r.reject ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : '-'}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                    {results.posthoc.interaction.tukey.length > 15 && (
                                                        <p className="text-xs text-muted-foreground mt-2">Showing first 15 of {results.posthoc.interaction.tukey.length} comparisons</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Games-Howell for Interaction */}
                                            {results.posthoc.interaction.games_howell && results.posthoc.interaction.games_howell.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                                        Games-Howell
                                                        {recommendedPostHoc === 'games_howell' && <Badge variant="default" className="text-xs ml-2">Recommended</Badge>}
                                                    </p>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Group 1</TableHead>
                                                                <TableHead>Group 2</TableHead>
                                                                <TableHead className="text-right">Mean Diff</TableHead>
                                                                <TableHead className="text-right">SE</TableHead>
                                                                <TableHead className="text-right">95% CI</TableHead>
                                                                <TableHead className="text-right">p-adj</TableHead>
                                                                <TableHead className="text-center">Sig.</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {results.posthoc.interaction.games_howell.slice(0, 15).map((r, i) => (
                                                                <TableRow key={i} className={r.reject ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                                                                    <TableCell className="text-sm">{r.group1}</TableCell>
                                                                    <TableCell className="text-sm">{r.group2}</TableCell>
                                                                    <TableCell className="text-right font-mono">{r.meandiff?.toFixed(3)}</TableCell>
                                                                    <TableCell className="text-right font-mono">{r.se?.toFixed(3)}</TableCell>
                                                                    <TableCell className="text-right font-mono">[{r.ci_lower?.toFixed(2)}, {r.ci_upper?.toFixed(2)}]</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Badge variant={r.reject ? 'default' : 'outline'}>{formatPValue(r.p_adj)}</Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">{r.reject ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : '-'}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                    {results.posthoc.interaction.games_howell.length > 15 && (
                                                        <p className="text-xs text-muted-foreground mt-2">Showing first 15 of {results.posthoc.interaction.games_howell.length} comparisons</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Factor A Post-hoc */}
                                    {results.posthoc.factor_a && (
                                        <div>
                                            <h4 className="font-semibold text-sm mb-3">{factorA} (Main Effect)</h4>
                                            
                                            {/* Tukey for Factor A */}
                                            {results.posthoc.factor_a.tukey && results.posthoc.factor_a.tukey.length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                                        Tukey HSD
                                                        {recommendedPostHoc === 'tukey' && <Badge variant="default" className="text-xs ml-2">Recommended</Badge>}
                                                    </p>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Group 1</TableHead>
                                                                <TableHead>Group 2</TableHead>
                                                                <TableHead className="text-right">Mean Diff</TableHead>
                                                                <TableHead className="text-right">95% CI</TableHead>
                                                                <TableHead className="text-right">p-adj</TableHead>
                                                                <TableHead className="text-center">Sig.</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {results.posthoc.factor_a.tukey.map((r, i) => (
                                                                <TableRow key={i} className={r.reject ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                                                                    <TableCell>{r.group1}</TableCell>
                                                                    <TableCell>{r.group2}</TableCell>
                                                                    <TableCell className="text-right font-mono">{r.meandiff?.toFixed(3)}</TableCell>
                                                                    <TableCell className="text-right font-mono">[{r.lower?.toFixed(2)}, {r.upper?.toFixed(2)}]</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Badge variant={r.reject ? 'default' : 'outline'}>{formatPValue(r.p_adj)}</Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">{r.reject ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : '-'}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                            
                                            {/* Games-Howell for Factor A */}
                                            {results.posthoc.factor_a.games_howell && results.posthoc.factor_a.games_howell.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                                        Games-Howell
                                                        {recommendedPostHoc === 'games_howell' && <Badge variant="default" className="text-xs ml-2">Recommended</Badge>}
                                                    </p>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Group 1</TableHead>
                                                                <TableHead>Group 2</TableHead>
                                                                <TableHead className="text-right">Mean Diff</TableHead>
                                                                <TableHead className="text-right">SE</TableHead>
                                                                <TableHead className="text-right">95% CI</TableHead>
                                                                <TableHead className="text-right">p-adj</TableHead>
                                                                <TableHead className="text-center">Sig.</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {results.posthoc.factor_a.games_howell.map((r, i) => (
                                                                <TableRow key={i} className={r.reject ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                                                                    <TableCell>{r.group1}</TableCell>
                                                                    <TableCell>{r.group2}</TableCell>
                                                                    <TableCell className="text-right font-mono">{r.meandiff?.toFixed(3)}</TableCell>
                                                                    <TableCell className="text-right font-mono">{r.se?.toFixed(3)}</TableCell>
                                                                    <TableCell className="text-right font-mono">[{r.ci_lower?.toFixed(2)}, {r.ci_upper?.toFixed(2)}]</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Badge variant={r.reject ? 'default' : 'outline'}>{formatPValue(r.p_adj)}</Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">{r.reject ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : '-'}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Factor B Post-hoc */}
                                    {results.posthoc.factor_b && (
                                        <div>
                                            <h4 className="font-semibold text-sm mb-3">{factorB} (Main Effect)</h4>
                                            
                                            {/* Tukey for Factor B */}
                                            {results.posthoc.factor_b.tukey && results.posthoc.factor_b.tukey.length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                                        Tukey HSD
                                                        {recommendedPostHoc === 'tukey' && <Badge variant="default" className="text-xs ml-2">Recommended</Badge>}
                                                    </p>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Group 1</TableHead>
                                                                <TableHead>Group 2</TableHead>
                                                                <TableHead className="text-right">Mean Diff</TableHead>
                                                                <TableHead className="text-right">95% CI</TableHead>
                                                                <TableHead className="text-right">p-adj</TableHead>
                                                                <TableHead className="text-center">Sig.</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {results.posthoc.factor_b.tukey.map((r, i) => (
                                                                <TableRow key={i} className={r.reject ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                                                                    <TableCell>{r.group1}</TableCell>
                                                                    <TableCell>{r.group2}</TableCell>
                                                                    <TableCell className="text-right font-mono">{r.meandiff?.toFixed(3)}</TableCell>
                                                                    <TableCell className="text-right font-mono">[{r.lower?.toFixed(2)}, {r.upper?.toFixed(2)}]</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Badge variant={r.reject ? 'default' : 'outline'}>{formatPValue(r.p_adj)}</Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">{r.reject ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : '-'}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                            
                                            {/* Games-Howell for Factor B */}
                                            {results.posthoc.factor_b.games_howell && results.posthoc.factor_b.games_howell.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                                        Games-Howell
                                                        {recommendedPostHoc === 'games_howell' && <Badge variant="default" className="text-xs ml-2">Recommended</Badge>}
                                                    </p>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Group 1</TableHead>
                                                                <TableHead>Group 2</TableHead>
                                                                <TableHead className="text-right">Mean Diff</TableHead>
                                                                <TableHead className="text-right">SE</TableHead>
                                                                <TableHead className="text-right">95% CI</TableHead>
                                                                <TableHead className="text-right">p-adj</TableHead>
                                                                <TableHead className="text-center">Sig.</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {results.posthoc.factor_b.games_howell.map((r, i) => (
                                                                <TableRow key={i} className={r.reject ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                                                                    <TableCell>{r.group1}</TableCell>
                                                                    <TableCell>{r.group2}</TableCell>
                                                                    <TableCell className="text-right font-mono">{r.meandiff?.toFixed(3)}</TableCell>
                                                                    <TableCell className="text-right font-mono">{r.se?.toFixed(3)}</TableCell>
                                                                    <TableCell className="text-right font-mono">[{r.ci_lower?.toFixed(2)}, {r.ci_upper?.toFixed(2)}]</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Badge variant={r.reject ? 'default' : 'outline'}>{formatPValue(r.p_adj)}</Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">{r.reject ? <CheckCircle className="h-4 w-4 text-primary mx-auto" /> : '-'}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Assumption Tests */}
                        {results.assumptions && (
                            <Card>
                                <CardHeader><CardTitle>Assumption Tests</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Normality */}
                                    <div>
                                        <h4 className="font-semibold text-sm mb-3">Normality (Shapiro-Wilk)</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Group</TableHead>
                                                    <TableHead className="text-right">W</TableHead>
                                                    <TableHead className="text-right">p</TableHead>
                                                    <TableHead className="text-center">Normal</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.entries(results.assumptions.normality).map(([g, t]) => (
                                                    <TableRow key={g}>
                                                        <TableCell className="font-medium">{g}</TableCell>
                                                        <TableCell className="text-right font-mono">{t.statistic?.toFixed(4) || 'N/A'}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatPValue(t.p_value)}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant={t.normal ? 'outline' : 'destructive'}>
                                                                {t.normal === null ? 'N/A' : t.normal ? 'Yes' : 'No'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <p className="text-xs text-muted-foreground mt-2">p &gt; .05 indicates normality assumption is met.</p>
                                    </div>

                                    {/* Homogeneity */}
                                    <div>
                                        <h4 className="font-semibold text-sm mb-3">Homogeneity of Variance</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Test</TableHead>
                                                    <TableHead className="text-right">F</TableHead>
                                                    <TableHead className="text-right">df1</TableHead>
                                                    <TableHead className="text-right">df2</TableHead>
                                                    <TableHead className="text-right">p</TableHead>
                                                    <TableHead className="text-center">Equal Var.</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell className="font-medium">Levene&apos;s</TableCell>
                                                    <TableCell className="text-right font-mono">{results.assumptions.homogeneity.levene.statistic?.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{results.assumptions.homogeneity.levene.df1}</TableCell>
                                                    <TableCell className="text-right font-mono">{results.assumptions.homogeneity.levene.df2}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatPValue(results.assumptions.homogeneity.levene.p_value)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={results.assumptions.homogeneity.levene.equal_variances ? 'outline' : 'destructive'}>
                                                            {results.assumptions.homogeneity.levene.equal_variances ? 'Yes' : 'No'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium">Brown-Forsythe</TableCell>
                                                    <TableCell className="text-right font-mono">{results.assumptions.homogeneity.brown_forsythe.statistic?.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{results.assumptions.homogeneity.brown_forsythe.df1}</TableCell>
                                                    <TableCell className="text-right font-mono">{results.assumptions.homogeneity.brown_forsythe.df2}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatPValue(results.assumptions.homogeneity.brown_forsythe.p_value)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={results.assumptions.homogeneity.brown_forsythe.equal_variances ? 'outline' : 'destructive'}>
                                                            {results.assumptions.homogeneity.brown_forsythe.equal_variances ? 'Yes' : 'No'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                        <p className="text-xs text-muted-foreground mt-2">p &gt; .05 indicates equal variances. If violated, use Games-Howell post-hoc test.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Descriptive Stats Table (legacy format) */}
                        {results.descriptive_stats_table && results.descriptive_stats_table.mean && (
                            <Card>
                                <CardHeader><CardTitle>Descriptive Statistics (Mean ± SD)</CardTitle></CardHeader>
                                <CardContent>
                                    {(() => {
                                        const meanData = results.descriptive_stats_table.mean;
                                        const rowLabels = Object.keys(meanData).filter(r => r !== 'Column Mean');
                                        const firstRow = meanData[rowLabels[0]];
                                        const colLabels = firstRow && typeof firstRow === 'object' ? Object.keys(firstRow).filter(c => c !== 'Row Mean') : [];
                                        
                                        return (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{factorA} / {factorB}</TableHead>
                                                        {colLabels.map(c => <TableHead key={c} className="text-center">{c}</TableHead>)}
                                                        <TableHead className="text-right">Row Mean</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {rowLabels.map(r => (
                                                        <TableRow key={r}>
                                                            <TableCell className="font-medium">{r}</TableCell>
                                                            {colLabels.map(c => (
                                                                <TableCell key={c} className="text-center font-mono">
                                                                    {getDescValue(results.descriptive_stats_table, 'mean', r, c)?.toFixed(2)}
                                                                    <span className="text-muted-foreground text-xs"> (±{getDescValue(results.descriptive_stats_table, 'std', r, c)?.toFixed(2)})</span>
                                                                </TableCell>
                                                            ))}
                                                            <TableCell className="text-right font-mono">
                                                                {getDescValue(results.descriptive_stats_table, 'mean', r, 'Row Mean')?.toFixed(2)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow className="bg-muted/50">
                                                        <TableCell className="font-medium">Column Mean</TableCell>
                                                        {colLabels.map(c => (
                                                            <TableCell key={c} className="text-center font-mono">
                                                                {getDescValue(results.descriptive_stats_table, 'mean', 'Column Mean', c)?.toFixed(2)}
                                                            </TableCell>
                                                        ))}
                                                        <TableCell className="text-right font-mono">
                                                            {getDescValue(results.descriptive_stats_table, 'mean', 'Column Mean', 'Row Mean')?.toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    
                    <div className="mt-4 flex justify-start">
                        <Button variant="ghost" onClick={prevStep}>
                            <ChevronLeft className="mr-2 w-4 h-4" />Back
                        </Button>
                    </div>
                    </>
                )}
            </div>
            
            {/* Python Code Modal */}
            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
                title="Python Code - Two-Way ANOVA"
            />
        </div>
    );
}
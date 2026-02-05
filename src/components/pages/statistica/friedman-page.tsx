'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, FlaskConical, HelpCircle, CheckCircle, AlertTriangle, TrendingUp, Target, Layers, BookOpen, RefreshCw, Activity, Clock, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, BarChart3 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../../ui/label';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-577472426399.us-central1.run.app';


const friedmanMetricDefinitions: Record<string, string> = {
    friedman_test: "The Friedman test is a non-parametric method to compare three or more related measurements from the same subjects. It's the extension of the Wilcoxon signed-rank test to multiple time points or conditions.",
    chi_squared_statistic: "The χ² statistic measures how much the rank sums differ across conditions. It follows a chi-squared distribution with df = k-1, where k is the number of conditions.",
    repeated_measures: "Multiple measurements taken from the same subjects under different conditions or at different time points. Each subject serves as their own control.",
    within_subject_ranking: "For each subject, their responses across all conditions are ranked (1 = lowest, k = highest). This controls for individual baseline differences.",
    p_value: "The probability of obtaining results at least as extreme as observed, assuming no true differences exist across conditions. Values below 0.05 indicate significant differences.",
    kendalls_w: "Kendall's coefficient of concordance (W) measures the agreement among subjects in how they rank conditions. It ranges from 0 (no agreement) to 1 (perfect agreement).",
    degrees_of_freedom: "df = k - 1, where k is the number of conditions. For Friedman test with 4 time points, df = 3. Used to determine critical values from chi-squared distribution.",
    null_hypothesis: "H₀: All conditions come from the same distribution. There are no systematic differences in responses across conditions.",
    alternative_hypothesis: "H₁: At least one condition differs from the others. Not all conditions produce the same responses.",
    non_parametric: "Makes no assumptions about data distribution (normality, equal variances). Works with ranks, so it's robust to outliers and skewed data.",
    rm_anova_alternative: "Friedman is the non-parametric alternative to repeated measures ANOVA. Use when RM ANOVA assumptions (normality, sphericity) are violated.",
    concordance: "The degree to which subjects agree in their ranking of conditions. High concordance (W > 0.7) means most subjects rank conditions similarly.",
    mean_rank: "The average rank assigned to each condition across all subjects. Lower mean ranks indicate the condition was generally rated lower.",
    tied_ranks: "When a subject gives the same response to multiple conditions, they receive the average of the ranks they would occupy. Excessive ties reduce test power.",
    post_hoc_tests: "If Friedman is significant, conduct pairwise comparisons (e.g., Nemenyi test) to identify which specific conditions differ.",
    assumptions: "Friedman assumes: (1) Related/dependent observations, (2) Ordinal or continuous dependent variable, (3) Same subjects measured under all conditions.",
    sample_size: "Minimum 6 subjects recommended for valid results. Larger samples increase statistical power to detect differences.",
    statistical_power: "The probability of correctly detecting a true difference between conditions. Larger sample sizes and bigger effect sizes increase power.",
    very_weak_concordance: "W < 0.1. Almost no agreement among subjects. Individual differences dominate, making generalization difficult.",
    weak_concordance: "W between 0.1 and 0.3. Low agreement among subjects. Considerable individual variation in condition preferences.",
    moderate_concordance: "W between 0.3 and 0.5. Moderate agreement among subjects. Some consistent patterns emerge despite individual differences.",
    strong_concordance: "W between 0.5 and 0.7. High agreement among subjects. Most subjects show similar ranking patterns across conditions.",
    very_strong_concordance: "W > 0.7. Very high agreement among subjects. Nearly everyone ranks conditions in the same order.",
    robustness: "Friedman is robust to outliers, non-normality, and unequal variances, making it more reliable than RM ANOVA when assumptions are violated.",
    ordinal_data: "Data with ordered categories (e.g., Likert scales, rankings). Friedman is appropriate for ordinal outcome variables.",
    baseline_differences: "Individual subjects may have different baseline levels. Friedman controls for this by ranking within each subject.",
    carryover_effects: "In repeated measures designs, earlier conditions may influence later ones. Consider counterbalancing the order of conditions.",
    sphericity: "RM ANOVA assumes sphericity (equal variances of differences between conditions). Friedman makes no such assumption.",
    block_design: "Friedman can be viewed as a randomized block design where each subject is a 'block' and conditions are 'treatments'.",
    multiple_comparisons: "Testing many pairwise comparisons increases Type I error risk. Use Nemenyi test or Bonferroni correction to adjust p-values.",
    effect_size_interpretation: "W indicates practical significance: < 0.3 = small effect, 0.3-0.5 = moderate effect, > 0.5 = large effect.",
    type_i_error: "False positive - concluding conditions differ when they actually don't. Controlled by alpha level (typically 5%).",
    type_ii_error: "False negative - failing to detect real condition differences. Related to statistical power (1 - β).",
    learning_effects: "In repeated measures, subjects may improve over time due to practice. This can confound condition effects.",
    fatigue_effects: "In repeated measures, subjects may perform worse over time due to tiredness or boredom. Consider randomizing condition order.",
    crossover_design: "A study design where each subject receives all conditions in a randomized order. Ideal for Friedman test.",
    washout_period: "Time between conditions to allow effects to dissipate. Important in pharmacological or treatment studies.",
    treatment_order: "The sequence in which conditions are presented. Randomize to prevent order effects from confounding results.",
};


interface FriedmanResults {
    statistic: number;
    p_value: number;
    effect_size: number;
    df: number;
    effect_size_interpretation?: { text: string; level?: string; };
    interpretation?: string | { decision?: string; conclusion?: string; };
    condition_stats?: { [key: string]: { count: number; mean: number; median: number; std: number; min?: number; max?: number; }; };
}

interface FullAnalysisResponse {
    results: FriedmanResults;
    plot?: string;
    interpretations?: { overall_analysis: string; statistical_insights: string[]; recommendations: string; };
    n_dropped?: number;
    dropped_rows?: number[];
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

const getConcordanceInterpretation = (w: number) => {
    if (w < 0.1) return "Very weak";
    if (w < 0.3) return "Weak";
    if (w < 0.5) return "Moderate";
    if (w < 0.7) return "Strong";
    return "Very strong";
};

// Generate interpretations
const generateFriedmanInterpretations = (results: FriedmanResults, selectedVars: string[]) => {
    const insights: string[] = [];
    const isSignificant = results.p_value < 0.05;
    const kendallW = results.effect_size;
    const numConditions = selectedVars.length;
    const conditionNames = results.condition_stats ? Object.keys(results.condition_stats) : [];
    const conditionStats = results.condition_stats ? Object.values(results.condition_stats) : [];
    
    let overall = '';
    if (isSignificant) {
        if (kendallW >= 0.5) {
            overall = `<strong>Significant differences with strong concordance.</strong> The Friedman test revealed significant differences (χ² = ${results.statistic.toFixed(3)}, df = ${results.df}, p ${results.p_value < 0.001 ? '< 0.001' : `= ${results.p_value.toFixed(3)}`}) across ${numConditions} conditions. Kendall's W = ${kendallW.toFixed(3)} (strong).`;
        } else if (kendallW >= 0.3) {
            overall = `<strong>Significant differences with moderate concordance.</strong> The Friedman test identified significant differences (χ² = ${results.statistic.toFixed(3)}, df = ${results.df}, p = ${results.p_value.toFixed(3)}). Kendall's W = ${kendallW.toFixed(3)} (moderate).`;
        } else {
            overall = `<strong>Statistically significant but weak concordance.</strong> The test found significant differences (χ² = ${results.statistic.toFixed(3)}, p = ${results.p_value.toFixed(3)}), but weak W = ${kendallW.toFixed(3)}.`;
        }
    } else {
        overall = `<strong>No significant differences detected.</strong> The Friedman test found no significant differences (χ² = ${results.statistic.toFixed(3)}, df = ${results.df}, p = ${results.p_value.toFixed(3)}) across ${numConditions} conditions.`;
    }
    
    insights.push(`<strong>χ² Statistic:</strong> χ² = ${results.statistic.toFixed(3)}. Chi-squared test statistic based on within-subject ranks across ${numConditions} conditions.`);
    
    if (results.p_value < 0.001) {
        insights.push(`<strong>P-value:</strong> p < 0.001 (highly significant). Very strong evidence against the null hypothesis.`);
    } else if (results.p_value < 0.05) {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (significant at α = 0.05). Evidence suggests real differences.`);
    } else {
        insights.push(`<strong>P-value:</strong> p = ${results.p_value.toFixed(3)} (not significant). No statistical evidence of differences.`);
    }
    
    if (kendallW >= 0.5) {
        insights.push(`<strong>Kendall's W:</strong> W = ${kendallW.toFixed(3)} (strong agreement). High concordance in subject rankings.`);
    } else if (kendallW >= 0.3) {
        insights.push(`<strong>Kendall's W:</strong> W = ${kendallW.toFixed(3)} (moderate agreement). Noticeable consistency in rankings.`);
    } else {
        insights.push(`<strong>Kendall's W:</strong> W = ${kendallW.toFixed(3)} (weak agreement). Considerable individual variation.`);
    }
    
    if (conditionStats.length >= 2) {
        const means = conditionStats.map(s => s.mean);
        const maxMean = Math.max(...means);
        const minMean = Math.min(...means);
        const maxCondition = conditionNames[means.indexOf(maxMean)];
        const minCondition = conditionNames[means.indexOf(minMean)];
        insights.push(`<strong>Condition Range:</strong> Means from ${minMean.toFixed(2)} (${minCondition}) to ${maxMean.toFixed(2)} (${maxCondition}).`);
    }
    
    let recommendations = '';
    if (!isSignificant && kendallW < 0.3) {
        recommendations = 'No meaningful differences detected. Consider increasing sample size or checking condition distinctiveness.';
    } else if (isSignificant && kendallW < 0.3) {
        recommendations = 'Significant but weak concordance. Conduct post-hoc tests and examine individual subject patterns.';
    } else if (!isSignificant && kendallW >= 0.3) {
        recommendations = 'Moderate concordance but not significant - likely a power issue. Collect more data.';
    } else {
        recommendations = 'Significant differences with meaningful concordance. Conduct post-hoc pairwise comparisons (Nemenyi test).';
    }
    
    return { overall_analysis: overall, statistical_insights: insights, recommendations };
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: FriedmanResults }) => {
    const isSignificant = results.p_value < 0.05;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">χ² Statistic</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.statistic.toFixed(3)}</p><p className="text-xs text-muted-foreground">Test Statistic</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">P-value</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${!isSignificant ? 'text-red-600 dark:text-red-400' : ''}`}>{results.p_value < 0.001 ? '<0.001' : results.p_value.toFixed(4)}</p><p className="text-xs text-muted-foreground">{isSignificant ? 'Significant' : 'Not Significant'}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Kendall's W</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.effect_size.toFixed(3)}</p><p className="text-xs text-muted-foreground">{getConcordanceInterpretation(results.effect_size)} agreement</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Degrees of Freedom</p><Layers className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.df}</p><p className="text-xs text-muted-foreground">Conditions - 1</p></div></CardContent></Card>
        </div>
    );
};


const FriedmanGlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Friedman Test Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms and concepts used in non-parametric repeated measures analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(friedmanMetricDefinitions).map(([term, definition]) => (
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

// Friedman Test Analysis Guide Component
const FriedmanGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Friedman Test Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Friedman Test */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                What is the Friedman Test?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                The Friedman test is a <strong>non-parametric</strong> alternative to repeated measures ANOVA. 
                It compares <strong>3 or more related groups</strong> (same subjects measured multiple times) 
                using ranks instead of raw values.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Key Concept:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Each subject&apos;s responses across conditions are ranked (1 = lowest, k = highest). 
                    The test checks if mean ranks differ significantly across conditions.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use This Test?
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Use Friedman Test When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>Same subjects</strong> measured under 3+ conditions</li>
                    <li>• Data is <strong>not normally distributed</strong></li>
                    <li>• You have <strong>ordinal data</strong> (rankings, Likert scales)</li>
                    <li>• RM ANOVA assumptions are violated</li>
                    <li>• Sample sizes are small</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Use RM ANOVA Instead When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Data is normally distributed</li>
                    <li>• Sphericity assumption is met</li>
                    <li>• You need maximum statistical power</li>
                    <li>• Large sample sizes available</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* How It Works */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                How the Test Works
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <div>
                    <p className="font-medium text-sm">Within-Subject Ranking</p>
                    <p className="text-xs text-muted-foreground">For each subject, rank their responses across all conditions (1 = lowest value).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <div>
                    <p className="font-medium text-sm">Sum Ranks per Condition</p>
                    <p className="text-xs text-muted-foreground">Add up all ranks for each condition across all subjects.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  <div>
                    <p className="font-medium text-sm">Calculate χ² Statistic</p>
                    <p className="text-xs text-muted-foreground">Compare observed rank sums to expected values under the null hypothesis (no differences).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">4</div>
                  <div>
                    <p className="font-medium text-sm">Determine Significance</p>
                    <p className="text-xs text-muted-foreground">If p &lt; 0.05, conditions differ significantly. Use post-hoc tests to identify which.</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Statistics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Key Statistics Explained
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">χ² (Chi-squared) Statistic</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures how much the observed rank sums deviate from expected values.
                    <br/><strong>Larger χ²</strong> = greater differences among conditions.
                    <br/>df = k - 1 (where k = number of conditions)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Kendall&apos;s W (Concordance)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures <strong>agreement among subjects</strong> in how they rank conditions.
                    <br/>Ranges from 0 (no agreement) to 1 (perfect agreement).
                  </p>
                  <div className="mt-2 grid grid-cols-5 gap-1 text-xs">
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">&lt;0.1</p>
                      <p className="text-muted-foreground">Very weak</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">0.1-0.3</p>
                      <p className="text-muted-foreground">Weak</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">0.3-0.5</p>
                      <p className="text-muted-foreground">Moderate</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">0.5-0.7</p>
                      <p className="text-muted-foreground">Strong</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">&gt;0.7</p>
                      <p className="text-muted-foreground">Very strong</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Mean Rank</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The average rank assigned to each condition across subjects.
                    <br/>Lower mean rank = condition tends to score lower.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Assumptions */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Assumptions
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Related/Dependent Observations
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Same subjects must be measured under all conditions.
                    <br/><em>For independent groups, use Kruskal-Wallis test.</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Ordinal or Continuous Data
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Data must be at least ordinal (can be meaningfully ranked).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    3 or More Conditions
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Need at least 3 related measurements.
                    <br/><em>For 2 conditions, use Wilcoxon signed-rank test.</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Watch for Order Effects
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Practice/fatigue effects can confound results. Consider counterbalancing 
                    the order of conditions across subjects.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Post-hoc Tests */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Post-hoc Tests
              </h3>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">If Friedman is Significant (p &lt; 0.05):</p>
                <p className="text-xs text-muted-foreground mt-2">
                  The test only tells you that <em>some</em> conditions differ. To find out <em>which</em> ones:
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• <strong>Nemenyi test:</strong> Non-parametric equivalent of Tukey HSD</li>
                  <li>• <strong>Wilcoxon signed-rank tests:</strong> Pairwise comparisons with Bonferroni correction</li>
                  <li>• <strong>Conover test:</strong> More powerful but less conservative</li>
                </ul>
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
                  <p className="font-medium text-sm text-primary mb-1">Reporting (APA Style)</p>
                  <p className="text-xs text-muted-foreground">
                    Report: χ², df, p-value, Kendall&apos;s W
                    <br/>Example: χ²(3) = 15.42, p = .001, W = .51
                    <br/>Include condition medians and sample size
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Sample Size</p>
                  <p className="text-xs text-muted-foreground">
                    Minimum: 6 subjects recommended
                    <br/>Ideal: 10+ subjects for reliable results
                    <br/>More subjects = more power to detect differences
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Handling Ties</p>
                  <p className="text-xs text-muted-foreground">
                    When a subject gives identical responses, they receive average ranks.
                    <br/>Many ties can reduce statistical power.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">When NOT to Use</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• 2 conditions → Wilcoxon signed-rank</li>
                    <li>• Independent groups → Kruskal-Wallis</li>
                    <li>• Normal data, met assumptions → RM ANOVA</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Friedman test is about <strong>ranks within subjects</strong>, 
                not raw values. It controls for individual baseline differences by comparing how each subject 
                ranks conditions relative to their own responses. Always report Kendall&apos;s W to show 
                how much subjects agree in their rankings.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};



// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (example: ExampleDataSet) => void }) => {
    const friedmanExample = exampleDatasets.find(d => d.analysisTypes?.includes('friedman'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><RefreshCw className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Friedman Test</CardTitle>
                    <CardDescription className="text-base mt-2">Non-parametric alternative to repeated measures ANOVA</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><RefreshCw className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Repeated Measures</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Compare 3+ related measurements</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Activity className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Rank-Based</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Within-subject ranking</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Kendall's W</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Concordance coefficient</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />When to Use</h3>
                        <p className="text-sm text-muted-foreground mb-4">Non-parametric alternative to RM ANOVA. Use for 3+ related measurements that don't meet normality assumptions.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li>• Same subjects measured 3+ times</li>
                                    <li>• At least 3 numeric variables</li>
                                    <li>• Each row = one subject</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Results</h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li>• χ² statistic</li>
                                    <li>• p &lt; 0.05 = Significant</li>
                                    <li>• Kendall's W (0-1)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {friedmanExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(friedmanExample)} size="lg"><RefreshCw className="mr-2 h-5 w-5" />Load Example Data</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface FriedmanPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function FriedmanPage({ data, numericHeaders, onLoadExample }: FriedmanPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [selectedVars, setSelectedVars] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false); // 👈 추가
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ 
            label: 'At least 3 variables selected', 
            passed: selectedVars.length >= 3, 
            detail: `${selectedVars.length} variable(s) selected (need at least 3)` 
        });
        
        checks.push({ 
            label: 'Adequate sample size', 
            passed: data.length >= 6, 
            detail: `n = ${data.length} subjects (recommended: 6+)` 
        });
        
        checks.push({ 
            label: 'Good sample size', 
            passed: data.length >= 10, 
            detail: `n = ${data.length} subjects (ideal: 10+)` 
        });
        
        return checks;
    }, [data, selectedVars]);

    const allValidationsPassed = useMemo(() => {
        return selectedVars.length >= 3;
    }, [selectedVars]);

    useEffect(() => {
        if (data.length === 0 || !canRun) {
            setView('intro');
        } else {
            setSelectedVars(numericHeaders.slice(0, Math.min(3, numericHeaders.length)));
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, canRun]);

    const handleVarSelectionChange = (header: string, checked: boolean) => {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { handleAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Friedman_Test_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        const results = analysisResult.results;
        let csvContent = "FRIEDMAN TEST\n";
        csvContent += `Conditions: ${selectedVars.join(', ')}\n\n`;
        csvContent += `Chi-squared: ${results.statistic}\ndf: ${results.df}\nP-value: ${results.p_value}\nKendall W: ${results.effect_size}\n\n`;
        if (results.condition_stats) {
            csvContent += "CONDITION STATISTICS\n";
            const statsData = Object.entries(results.condition_stats).map(([c, s]) => ({ Condition: c, N: s.count, Mean: s.mean, Median: s.median, StdDev: s.std }));
            csvContent += Papa.unparse(statsData) + "\n";
        }
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Friedman_Test_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, selectedVars, toast]);

    // handleDownloadDOCX 함수 추가
const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult?.results) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/friedman-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                results: analysisResult.results,
                selectedVars,
                sampleSize: data.length
            })
        });
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Friedman_Test_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, selectedVars, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (selectedVars.length < 3) {
            toast({ variant: "destructive", title: "Please select at least 3 variables." });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/friedman`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, variables: selectedVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            result.interpretations = generateFriedmanInterpretations(result.results, selectedVars);
            setAnalysisResult(result);
            goToStep(4);

        } catch (e: any) {
            toast({ variant: "destructive", title: "Analysis Error", description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedVars, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep;
                    return (
                        <button key={step.id} onClick={() => isClickable && goToStep(step.id)} disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            <FriedmanGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <FriedmanGlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
    
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Friedman Test</h1>
                    <p className="text-muted-foreground mt-1">Non-parametric repeated measures comparison</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Analysis Guide
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setGlossaryModalOpen(true)}>
                        <HelpCircle className="w-5 h-5"/>
                    </Button>
                </div>
            </div>
            <ProgressBar />
            <div className="min-h-[500px]">
                {/* Step 1: Select Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Conditions</CardTitle><CardDescription>Choose 3+ related measurements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Conditions/Time Points ({selectedVars.length} selected)</Label>
                                <ScrollArea className="h-48 p-4 border rounded-xl bg-muted/30">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {numericHeaders.map(header => (
                                            <div key={header} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                <Checkbox
                                                    id={`friedman-${header}`}
                                                    checked={selectedVars.includes(header)}
                                                    onCheckedChange={(checked) => handleVarSelectionChange(header, checked as boolean)}
                                                />
                                                <Label htmlFor={`friedman-${header}`} className="text-sm font-normal cursor-pointer truncate">{header}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                {selectedVars.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {selectedVars.map(v => <Badge key={v} variant="secondary">{v}</Badge>)}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample: <span className="font-semibold text-foreground">{data.length}</span> subjects across conditions</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={selectedVars.length < 3}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Model Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Test Settings</CardTitle><CardDescription>Review Friedman test configuration</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Conditions:</strong> {selectedVars.length} ({selectedVars.join(', ')})</p>
                                    <p>• <strong className="text-foreground">Subjects:</strong> {data.length}</p>
                                    <p>• <strong className="text-foreground">Test Type:</strong> Friedman rank sum test</p>
                                    <p>• <strong className="text-foreground">Effect Size:</strong> Kendall's W (concordance)</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />About the Test</h4>
                                <p className="text-sm text-muted-foreground">Friedman test is the non-parametric alternative to repeated measures ANOVA. It ranks observations within each subject across conditions, then tests if rank distributions differ.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3: Data Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking if your data is ready</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (
                                    <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>
                                        {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
                                        <div>
                                            <p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <RefreshCw className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">The test will rank each subject's responses across conditions and compare rank distributions.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <>Run Test<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const isSignificant = results.p_value < 0.05;
                    const w = results.effect_size;
                    const isGood = isSignificant && w >= 0.3;
                    const pPct = (results.p_value * 100).toFixed(1);
                    const conditionStats = results.condition_stats ? Object.entries(results.condition_stats) : [];

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Comparison across {selectedVars.length} conditions</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {isSignificant 
                                                ? `Meaningful differences were found among the ${selectedVars.length} conditions. Participants responded differently across conditions.`
                                                : `No statistically significant differences among the ${selectedVars.length} conditions. Responses were similar regardless of condition.`}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {w >= 0.7 
                                                ? 'Very high concordance among participants. Most agree on which conditions rank higher/lower.'
                                                : w >= 0.5 
                                                    ? 'High concordance among participants. Many show similar ranking patterns.'
                                                    : w >= 0.3
                                                        ? 'Moderate concordance among participants. Some common patterns exist.'
                                                        : 'Low concordance among participants. Individual differences are substantial.'}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {conditionStats.length > 0 
                                                ? `Mean ranks by condition: ${conditionStats.slice(0, 3).map(([name, stats]: [string, any]) => `${name} (${stats.mean_rank?.toFixed(1)})`).join(', ')}${conditionStats.length > 3 ? '...' : ''}`
                                                : 'Ranks were compared across each condition.'}
                                        </p></div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isGood ? "Condition Differences Confirmed!" : isSignificant ? "Differences Exist but Low Concordance" : "No Significant Differences"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood ? "Participants consistently prefer certain conditions. Focus on those conditions." : isSignificant ? "Differences exist but high individual variation makes generalization difficult." : "All conditions were rated similarly."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Evidence Section */}
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-slate-600" />
                                        Evidence
                                    </h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>• <strong>χ² Statistic:</strong> {results.statistic.toFixed(3)} (df = {results.df}) — Summary of rank differences across conditions. Larger values indicate clearer differences.</p>
                                        <p>• <strong>p-value:</strong> {results.p_value < 0.001 ? '< 0.001' : results.p_value.toFixed(4)} — {isSignificant 
                                            ? `Probability this difference occurred by chance is only ${pPct}%. Below 5%, so statistically significant.`
                                            : `Probability this difference occurred by chance is ${pPct}%. Above 5%, so cannot rule out chance.`}</p>
                                        <p>• <strong>Kendall's W (Concordance):</strong> {w.toFixed(3)} — Measures how consistently participants ranked conditions. {w >= 0.7 ? 'Above 0.7 is high concordance.' : w >= 0.5 ? '0.5-0.7 is moderate concordance.' : 'Below 0.5 is low concordance.'} (Range: 0 to 1)</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Concordance Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = w >= 0.7 ? 5 : w >= 0.5 ? 4 : w >= 0.3 ? 3 : w >= 0.1 ? 2 : 1;
                                        return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;
                                    })}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning - Business Friendly */}
                {currentStep === 5 && results && analysisResult?.interpretations && (() => {
                    const conditionStats = results.condition_stats ? Object.entries(results.condition_stats) : [];
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding Friedman test results</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">How the Test Works</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Friedman <strong className="text-foreground">ranks each subject's responses</strong> across conditions (1 = lowest, k = highest), 
                                                then tests if mean ranks differ significantly across conditions.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Your Conditions Compared</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {conditionStats.map(([name, stats], i) => (
                                                    <span key={name}>
                                                        <strong className="text-foreground">{name}</strong>: mean = {stats.mean.toFixed(2)}, median = {stats.median.toFixed(2)}
                                                        {i < conditionStats.length - 1 ? '; ' : '.'}
                                                    </span>
                                                ))}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Kendall's W Interpretation</h4>
                                            <p className="text-sm text-muted-foreground">
                                                W = {results.effect_size.toFixed(3)} indicates <strong className="text-foreground">{getConcordanceInterpretation(results.effect_size).toLowerCase()}</strong> agreement among subjects. 
                                                {results.effect_size >= 0.3 
                                                    ? ' Subjects show consistent ranking patterns.'
                                                    : ' There is considerable individual variation in preferences.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Recommendation</h4>
                                            <p className="text-sm text-muted-foreground">{analysisResult.interpretations.recommendations}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${results.p_value < 0.05 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line
                                    </h4>
                                    <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: analysisResult.interpretations.overall_analysis }} />
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Kendall's W Guide</h4>
                                    <div className="grid grid-cols-5 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt; 0.1</p><p className="text-muted-foreground">Very weak</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.1-0.3</p><p className="text-muted-foreground">Weak</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.3-0.5</p><p className="text-muted-foreground">Moderate</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.5-0.7</p><p className="text-muted-foreground">Strong</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt; 0.7</p><p className="text-muted-foreground">Very strong</p></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && results && analysisResult && (() => {
                    const conditionStats = results.condition_stats ? Object.entries(results.condition_stats) : [];
                    
                    return (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}><FileText className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Friedman Test Report</h2><p className="text-sm text-muted-foreground mt-1">Conditions: {selectedVars.join(', ')} | N = {data.length} | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards results={results} />
                        
                        {/* Missing Values Alert */}
                        {analysisResult.n_dropped !== undefined && analysisResult.n_dropped > 0 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Missing Values</AlertTitle>
                                <AlertDescription>{analysisResult.n_dropped} row(s) excluded due to missing values.</AlertDescription>
                            </Alert>
                        )}
                        
                        {/* Detailed Analysis - APA Format */}
                        <Card>
                            <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold">Statistical Summary</h3>
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            A Friedman test was conducted to compare responses across {selectedVars.length} related conditions 
                                            (<em>N</em> = {data.length} subjects). The conditions were: {conditionStats.map(([name, stats], i) => (
                                                <span key={name}>{name} (<em>M</em> = {stats.mean.toFixed(2)}, <em>Mdn</em> = {stats.median.toFixed(2)}){i < conditionStats.length - 1 ? ', ' : '.'}</span>
                                            ))}
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            The test {results.p_value < 0.05 ? 'revealed statistically significant differences' : 'did not reveal statistically significant differences'} among the conditions, 
                                            <span className="font-mono"> χ²({results.df}) = {results.statistic.toFixed(2)}</span>, 
                                            <em> p</em> {results.p_value < 0.001 ? '< .001' : `= ${results.p_value.toFixed(3)}`}, 
                                            <em> W</em> = {results.effect_size.toFixed(3)}.
                                        </p>
                                        
                                        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                            Kendall's coefficient of concordance (<em>W</em> = {results.effect_size.toFixed(3)}) indicates {getConcordanceInterpretation(results.effect_size).toLowerCase()} agreement 
                                            among subjects in their ranking of conditions, suggesting that {results.effect_size >= 0.3 ? 'there is meaningful consistency in how subjects respond across conditions' : 'considerable individual variation exists in condition preferences'}.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Descriptive Statistics Table */}
                        {results.condition_stats && (
                            <Card>
                                <CardHeader><CardTitle>Descriptive Statistics</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Condition</TableHead><TableHead className="text-right">N</TableHead><TableHead className="text-right">Mean</TableHead><TableHead className="text-right">Median</TableHead><TableHead className="text-right">Std. Dev</TableHead><TableHead className="text-right">Min</TableHead><TableHead className="text-right">Max</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {Object.entries(results.condition_stats).map(([cond, stats]) => (
                                                <TableRow key={cond}>
                                                    <TableCell className="font-medium">{cond}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.count}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.median.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.std.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.min?.toFixed(3) ?? 'N/A'}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.max?.toFixed(3) ?? 'N/A'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Visualization */}
                        {analysisResult.plot && (
                            <Card>
                                <CardHeader><CardTitle>Visualization</CardTitle><CardDescription>Distribution comparison</CardDescription></CardHeader>
                                <CardContent className="flex justify-center">
                                    <Image src={analysisResult.plot} alt="Friedman Test Visualization" width={1500} height={1200} className="w-3/4 rounded-md border" />
                                </CardContent>
                            </Card>
                        )}

                        {/* Test Results Table */}
                        <Card>
                            <CardHeader><CardTitle>Test Results</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Statistic</TableHead><TableHead className="text-right">χ² Value</TableHead><TableHead className="text-right">df</TableHead><TableHead className="text-right">p-value</TableHead><TableHead className="text-right">Kendall's W</TableHead><TableHead className="text-center">Concordance</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Friedman</TableCell>
                                            <TableCell className="text-right font-mono">{results.statistic.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{results.df}</TableCell>
                                            <TableCell className="text-right"><Badge variant={results.p_value < 0.05 ? 'default' : 'outline'}>{results.p_value < 0.001 ? '<.001' : results.p_value.toFixed(4)}</Badge></TableCell>
                                            <TableCell className="text-right font-mono">{results.effect_size.toFixed(3)}</TableCell>
                                            <TableCell className="text-center"><Badge variant={results.effect_size >= 0.3 ? 'default' : 'secondary'}>{results.effect_size_interpretation?.text || getConcordanceInterpretation(results.effect_size)}</Badge></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter><p className="text-sm text-muted-foreground">Kendall's W ranges from 0 (no agreement) to 1 (complete agreement)</p></CardFooter>
                        </Card>
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}
            </div>
        </div>
    );
}
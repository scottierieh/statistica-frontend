'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Loader2, AlertTriangle, FileSearch, Settings, HelpCircle, Columns, TrendingUp, Target, CheckCircle, BarChart3, Lightbulb, BookOpen, Info, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, FileText, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, Check, ArrowRight, ChevronDown, FileCode, FileType, Activity, Code, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '../../ui/badge';
import { Label } from '../../ui/label';
import { ScrollArea } from '../../ui/scroll-area';
import Image from 'next/image';
import type { DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/crosstab_chi_square.py?alt=media";

interface CrosstabResults {
  contingency_table: { [key: string]: { [key: string]: number } };
  chi_squared: { statistic: number; p_value: number; degrees_of_freedom: number };
  cramers_v: number;
  interpretation: string;
  row_totals?: { [key: string]: number };
  col_totals?: { [key: string]: number };
  total?: number;
  n_dropped?: number;
  dropped_rows?: number[];
  expected_frequencies?: number[][];
}

interface FullAnalysisResponse {
  results: CrosstabResults;
  plot?: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Data' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' },
];

const PythonCodeModal = ({ isOpen, onClose, codeUrl }: { isOpen: boolean; onClose: () => void; codeUrl: string }) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !code) fetchCode();
    }, [isOpen, code]);

    const fetchCode = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(codeUrl);
            if (!response.ok) throw new Error(`Failed to fetch code: ${response.status}`);
            setCode(await response.text());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load Python code');
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load Python code' });
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
        link.download = 'crosstab_chi_square.py';
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
                    <DialogTitle className="flex items-center gap-2"><Code className="w-5 h-5 text-primary" />Python Code - Chi-Squared Test</DialogTitle>
                    <DialogDescription>View, copy, or download the Python code used for this analysis.</DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 py-2">
                    <Button variant="outline" size="sm" onClick={handleCopy} disabled={isLoading || !!error}><Copy className="mr-2 h-4 w-4" />Copy Code</Button>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={isLoading || !!error}><Download className="mr-2 h-4 w-4" />Download .py</Button>
                    {error && <Button variant="outline" size="sm" onClick={fetchCode}><Loader2 className="mr-2 h-4 w-4" />Retry</Button>}
                </div>
                <div className="flex-1 min-h-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64 bg-slate-950 rounded-lg"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-3 text-slate-300">Loading code...</span></div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-slate-950 rounded-lg text-center"><AlertTriangle className="h-10 w-10 text-amber-500 mb-3" /><p className="text-slate-300 mb-2">Failed to load code</p><p className="text-slate-500 text-sm">{error}</p></div>
                    ) : (
                        <ScrollArea className="h-[50vh] w-full rounded-lg border bg-slate-950"><pre className="p-4 text-sm text-slate-50 overflow-x-auto"><code className="language-python">{code}</code></pre></ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const CrosstabGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Chi-Squared Test Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Chi-Squared Test */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                What is the Chi-Squared Test?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                The Chi-Squared (χ²) test determines whether there is a statistically significant association 
                between two categorical variables. It compares observed frequencies with expected frequencies 
                under the assumption of independence.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Real-world example:</strong> Testing if customer satisfaction (Low/Medium/High) 
                  is related to product type (A/B/C). A significant result means satisfaction levels 
                  differ across products.
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use Chi-Squared?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• You have <strong>two categorical variables</strong></li>
                    <li>• You want to test if they are <strong>independent or associated</strong></li>
                    <li>• Your data consists of <strong>counts or frequencies</strong></li>
                    <li>• Each observation belongs to <strong>only one category</strong></li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    Don't use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• Your variables are continuous (use correlation or t-test)</li>
                    <li>• Expected cell counts are less than 5 (use Fisher's exact test)</li>
                    <li>• Observations are not independent (paired/matched data)</li>
                    <li>• Sample size is very small (n &lt; 20)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* How It Works */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                How Chi-Squared Works
              </h3>
              <div className="space-y-4">
                <div className="pl-4 border-l-2 border-primary/30">
                  <p className="font-medium text-sm">1. Create a Contingency Table</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cross-tabulate the two variables, counting how many observations fall into each 
                    combination of categories.
                  </p>
                </div>

                <div className="pl-4 border-l-2 border-primary/30">
                  <p className="font-medium text-sm">2. Calculate Expected Frequencies</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    If the variables were independent, what counts would we expect in each cell? 
                    Expected = (Row Total × Column Total) / Grand Total
                  </p>
                </div>

                <div className="pl-4 border-l-2 border-primary/30">
                  <p className="font-medium text-sm">3. Compare Observed vs Expected</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    χ² = Σ (Observed - Expected)² / Expected. Large differences between observed 
                    and expected counts lead to a large χ² value.
                  </p>
                </div>

                <div className="pl-4 border-l-2 border-primary/30">
                  <p className="font-medium text-sm">4. Determine Significance</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Compare the χ² value to a chi-squared distribution with appropriate degrees of 
                    freedom: df = (rows - 1) × (columns - 1)
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
                  <p className="font-medium text-sm">P-value Interpretation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>p &lt; 0.05:</strong> Variables are significantly associated (reject independence).<br/>
                    <strong>p ≥ 0.05:</strong> No significant association found (cannot reject independence).<br/>
                    <strong>Note:</strong> Statistical significance doesn't mean practical importance!
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Cramér's V — Effect Size</p>
                  <div className="grid grid-cols-4 gap-2 mt-2 text-xs text-center">
                    <div className="p-2 bg-background rounded">
                      <p className="font-bold">V &lt; 0.1</p>
                      <p className="text-muted-foreground">Negligible</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <p className="font-bold">0.1 - 0.3</p>
                      <p className="text-muted-foreground">Small</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <p className="font-bold">0.3 - 0.5</p>
                      <p className="text-muted-foreground">Medium</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <p className="font-bold">V &gt; 0.5</p>
                      <p className="text-muted-foreground">Large</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Why Report Both?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>P-value:</strong> Tells you if the association is real (not due to chance).<br/>
                    <strong>Cramér's V:</strong> Tells you how strong the association is.<br/>
                    A significant p-value with small V means: real but weak association.
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
                  <p className="font-medium text-sm text-primary mb-1">Marketing & Business</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Customer segment vs. purchase behavior</li>
                    <li>• Campaign type vs. conversion outcome</li>
                    <li>• Region vs. product preference</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Healthcare</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Treatment vs. recovery status</li>
                    <li>• Risk factor vs. disease presence</li>
                    <li>• Demographics vs. health outcomes</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Social Science</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Education level vs. voting preference</li>
                    <li>• Gender vs. career choice</li>
                    <li>• Age group vs. media consumption</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Quality Control</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Machine vs. defect type</li>
                    <li>• Shift vs. error rate category</li>
                    <li>• Supplier vs. quality grade</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Assumptions */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Assumptions & Requirements
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">1. Independence of Observations</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each observation must be independent. One person/item cannot appear in multiple cells.
                    <br/><strong>Violated?</strong> Use McNemar's test for paired data.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">2. Expected Cell Frequencies ≥ 5</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All cells should have expected counts of at least 5. If not, results may be unreliable.
                    <br/><strong>Violated?</strong> Use Fisher's Exact Test or combine categories.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">3. Mutually Exclusive Categories</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each observation must belong to exactly one category per variable.
                    <br/><strong>Violated?</strong> Restructure your categories or use different methods.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Tip:</strong> This tool checks if expected frequencies are adequate. 
                    If you see a warning, consider combining rare categories or using Fisher's exact test.
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
                  <p className="font-medium text-sm text-primary mb-1">Before Analysis</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Check sample size is adequate (n ≥ 20)</li>
                    <li>• Verify categories are meaningful</li>
                    <li>• Handle missing data appropriately</li>
                    <li>• Consider combining rare categories</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpreting Results</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report both χ² and Cramér's V</li>
                    <li>• Examine the contingency table patterns</li>
                    <li>• Look at row/column percentages</li>
                    <li>• Consider practical significance</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Include χ², df, p-value, and N</li>
                    <li>• Report effect size (Cramér's V)</li>
                    <li>• APA: χ²(df, N = n) = value, p = .xxx</li>
                    <li>• Describe the pattern found</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Common Mistakes</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Using percentages instead of counts</li>
                    <li>• Ignoring low expected frequencies</li>
                    <li>• Confusing significance with importance</li>
                    <li>• Inferring causation from association</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Chi-squared tests association, not causation. 
                A significant result means the variables are related, but doesn't tell you why or which causes which. 
                Always consider confounding variables and the study design.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// Statistical Terms Glossary for Chi-Squared Analysis
const chiSquaredMetricDefinitions: Record<string, string> = {
    chi_squared: "A test statistic (χ²) that measures how much observed frequencies differ from expected frequencies under the null hypothesis of independence. Larger values indicate stronger evidence against independence.",
    contingency_table: "A cross-tabulation table showing the frequency distribution of two categorical variables. Rows represent one variable, columns represent another, and cells contain counts.",
    observed_frequency: "The actual count of observations in each cell of the contingency table. What you actually see in your data.",
    expected_frequency: "The count you would expect in each cell if the two variables were completely independent. Calculated as (Row Total × Column Total) / Grand Total.",
    degrees_of_freedom: "For chi-squared tests: df = (rows - 1) × (columns - 1). Determines which chi-squared distribution to use for calculating the p-value.",
    p_value: "The probability of observing a chi-squared value this large (or larger) if the variables were truly independent. p < 0.05 typically indicates a significant association.",
    cramers_v: "An effect size measure for the strength of association between two categorical variables. Ranges from 0 (no association) to 1 (perfect association). Calculated from χ² adjusted for table size.",
    independence: "The null hypothesis that two categorical variables are unrelated—knowing one variable doesn't help predict the other. The chi-squared test tests this assumption.",
    association: "A relationship between two categorical variables where the distribution of one variable differs across levels of the other. The alternative hypothesis in chi-squared tests.",
    cell: "One intersection of a row and column in a contingency table. Contains the count (frequency) of observations with that specific combination of categories.",
    marginal_totals: "The row totals and column totals in a contingency table. Used to calculate expected frequencies.",
    grand_total: "The total number of observations (N) in the entire contingency table. Sum of all cell frequencies.",
    row_percentage: "The percentage of each row's total that falls into each column category. Shows how column categories are distributed within each row.",
    column_percentage: "The percentage of each column's total that falls into each row category. Shows how row categories are distributed within each column.",
    effect_size: "A measure of the magnitude or strength of an association, independent of sample size. Cramér's V is the standard effect size for chi-squared tests.",
    statistical_significance: "Whether the association is unlikely to have occurred by chance (typically p < 0.05). Does not indicate the strength or practical importance of the association.",
    practical_significance: "Whether the association is large enough to matter in real-world terms. A statistically significant but small Cramér's V may not be practically meaningful.",
    fishers_exact_test: "An alternative to chi-squared when expected cell frequencies are less than 5. Calculates exact probability rather than using the chi-squared approximation.",
    null_hypothesis: "The assumption being tested: that the two categorical variables are independent (no association). Rejected when p < α (typically 0.05).",
    alternative_hypothesis: "The opposite of the null: that the two variables are associated (not independent). Accepted when we reject the null hypothesis."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Chi-Squared Test Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in chi-squared analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(chiSquaredMetricDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold capitalize">
                                    {term.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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

const StatisticalSummaryCards = ({ results }: { results: CrosstabResults }) => {
    const isSignificant = results.chi_squared.p_value < 0.05;
    const getEffectSizeInterpretation = (cramersV: number) => {
        if (cramersV >= 0.5) return 'Large';
        if (cramersV >= 0.3) return 'Medium';
        if (cramersV >= 0.1) return 'Small';
        return 'Negligible';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Chi-Squared (χ²)</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.chi_squared.statistic.toFixed(2)}</p><p className="text-xs text-muted-foreground">df = {results.chi_squared.degrees_of_freedom}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">P-value</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${!isSignificant ? 'text-rose-600 dark:text-rose-400' : ''}`}>{results.chi_squared.p_value < 0.001 ? '<0.001' : results.chi_squared.p_value.toFixed(4)}</p><p className="text-xs text-muted-foreground">{isSignificant ? 'Significant' : 'Not Significant'}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Cramer's V</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.cramers_v.toFixed(3)}</p><p className="text-xs text-muted-foreground">{getEffectSizeInterpretation(results.cramers_v)}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Sample Size</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.total || Object.values(results.contingency_table).reduce((acc, row) => acc + Object.values(row).reduce((sum, val) => sum + val, 0), 0)}</p><p className="text-xs text-muted-foreground">Total observations</p></div></CardContent></Card>
        </div>
    );
};

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const crosstabExample = exampleDatasets.find(d => d.id === 'crosstab');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Columns className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Crosstabulation & Chi-Squared</CardTitle>
                    <CardDescription className="text-base mt-2">Analyze relationships between two categorical variables</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Columns className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Contingency Table</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Frequency distribution across two variables</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><BarChart3 className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Chi-Squared Test</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Test if variables are independent</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Target className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Effect Size</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Measure association with Cramer's V</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><FileSearch className="w-5 h-5" />When to Use This Analysis</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use crosstabulation to explore relationships between two categorical variables. The Chi-Squared test determines if the relationship is statistically significant.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Requirements</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Variables:</strong> Two categorical variables</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Expected frequency:</strong> At least 5 per cell</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Independence:</strong> Observations independent</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Understanding Results</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>p &lt; 0.05:</strong> Variables are associated</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Cramer's V:</strong> 0 = none, 1 = perfect</span></li>
                                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span><strong>Table:</strong> Examine cell counts for patterns</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {crosstabExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(crosstabExample)} size="lg"><Columns className="mr-2 h-5 w-5" />Load Example Data</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface CrosstabPageProps {
  data: DataSet;
  categoricalHeaders: string[];
  onLoadExample?: (example: ExampleDataSet) => void;
  restoredState?: any;
}

export default function CrosstabPage({ data, categoricalHeaders, onLoadExample, restoredState }: CrosstabPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [rowVar, setRowVar] = useState<string>('');
    const [colVar, setColVar] = useState<string>('');
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length > 0 && categoricalHeaders.length >= 2, [data, categoricalHeaders]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        checks.push({ label: 'Two different variables', passed: rowVar !== '' && colVar !== '' && rowVar !== colVar, detail: rowVar && colVar && rowVar !== colVar ? `Row: ${rowVar}, Column: ${colVar}` : 'Select two different variables' });
        if (rowVar && colVar && rowVar !== colVar && data.length > 0) {
            const rowCategories = new Set(data.map((d: any) => d[rowVar]).filter((v: any) => v != null)).size;
            const colCategories = new Set(data.map((d: any) => d[colVar]).filter((v: any) => v != null)).size;
            checks.push({ label: 'Table dimensions', passed: rowCategories >= 2 && colCategories >= 2, detail: `${rowCategories} × ${colCategories} table` });
            const expectedFreq = data.length / (rowCategories * colCategories);
            checks.push({ label: 'Expected frequency check', passed: expectedFreq >= 5, detail: expectedFreq >= 5 ? `Expected ~${expectedFreq.toFixed(1)} per cell (good)` : `Expected ~${expectedFreq.toFixed(1)} per cell (may be low)` });
        }
        checks.push({ label: 'Sufficient sample size', passed: data.length >= 20, detail: `n = ${data.length} observations (minimum: 20)` });
        if (rowVar && colVar && data.length > 0) {
            const isMissing = (value: any) => value == null || value === '';
            const missingCount = data.filter((row: any) => isMissing(row[rowVar]) || isMissing(row[colVar])).length;
            checks.push({ label: 'Missing values check', passed: missingCount === 0, detail: missingCount === 0 ? 'No missing values detected' : `${missingCount} rows with missing values will be excluded` });
        }
        return checks;
    }, [data, rowVar, colVar]);

    const allValidationsPassed = dataValidation.filter(c => c.label === 'Two different variables' || c.label === 'Sufficient sample size').every(check => check.passed);

    useEffect(() => {
        if (categoricalHeaders.length > 0 && !rowVar) setRowVar(categoricalHeaders[0]);
        if (categoricalHeaders.length > 1 && !colVar) setColVar(categoricalHeaders[1]);
    }, [categoricalHeaders, rowVar, colVar]);

    useEffect(() => {
        if (restoredState) {
            setRowVar(restoredState.params.rowVar || categoricalHeaders[0] || '');
            setColVar(restoredState.params.colVar || categoricalHeaders[1] || '');
            setAnalysisResult({ results: restoredState.results, plot: '' });
            setView('main');
            setCurrentStep(4);
            setMaxReachedStep(6);
        } else {
            setView(canRun ? 'main' : 'intro');
            setAnalysisResult(null);
        }
    }, [restoredState, canRun, categoricalHeaders]);

    useEffect(() => {
        if (!restoredState) {
            setView(canRun ? 'main' : 'intro');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, categoricalHeaders, canRun]);

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { handleAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const getEffectSizeInterpretation = (v: number) => {
        if (v >= 0.5) return { label: 'Large', color: 'text-foreground' };
        if (v >= 0.3) return { label: 'Medium', color: 'text-foreground' };
        if (v >= 0.1) return { label: 'Small', color: 'text-foreground' };
        return { label: 'Negligible', color: 'text-muted-foreground' };
    };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results to download' }); return; }
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `Crosstab_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = image;
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const results = analysisResult.results;
        const testResults = [{ chi_squared_statistic: results.chi_squared.statistic, degrees_of_freedom: results.chi_squared.degrees_of_freedom, p_value: results.chi_squared.p_value, cramers_v: results.cramers_v, significant: results.chi_squared.p_value < 0.05 }];
        const contingencyData: any[] = [];
        Object.entries(results.contingency_table).forEach(([rowKey, rowData]) => {
            Object.entries(rowData).forEach(([colKey, count]) => {
                contingencyData.push({ [rowVar]: rowKey, [colVar]: colKey, count: count });
            });
        });
        let csvContent = "CHI-SQUARED TEST RESULTS\n" + Papa.unparse(testResults) + "\n\nCONTINGENCY TABLE\n" + Papa.unparse(contingencyData) + "\n\nINTERPRETATION\n" + `"${results.interpretation.replace(/"/g, '""')}"\n`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Crosstab_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, rowVar, colVar, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/crosstab-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: analysisResult.results, rowVar, colVar, sampleSize: data.length, plot: analysisResult.plot })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `ChiSquared_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch { toast({ variant: 'destructive', title: "Failed" }); }
    }, [analysisResult, rowVar, colVar, data.length, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!rowVar || !colVar || rowVar === colVar) { toast({ variant: 'destructive', title: 'Please select two different variables.' }); return; }
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/chi-square`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, rowVar, colVar })
            });
            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                let errorMsg = `HTTP error! status: ${response.status}`;
                if (typeof errorResult.detail === 'string') errorMsg = errorResult.detail;
                else if (Array.isArray(errorResult.detail)) errorMsg = errorResult.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
                else if (errorResult.error) errorMsg = typeof errorResult.error === 'string' ? errorResult.error : JSON.stringify(errorResult.error);
                throw new Error(errorMsg);
            }
            const result = await response.json();
            if (result.error) throw new Error(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'Chi-Squared Test Complete', description: 'Results are ready.' });
        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, rowVar, colVar, toast]);

    const results = analysisResult?.results;

    const rowTotals = useMemo(() => {
        if (!results) return {};
        const totals: { [key: string]: number } = {};
        Object.entries(results.contingency_table).forEach(([rowKey, rowData]) => {
            totals[rowKey] = Object.values(rowData).reduce((sum, val) => sum + val, 0);
        });
        return totals;
    }, [results]);

    const colTotals = useMemo(() => {
        if (!results) return {};
        const totals: { [key: string]: number } = {};
        const firstRow = Object.keys(results.contingency_table)[0];
        if (firstRow) {
            Object.keys(results.contingency_table[firstRow]).forEach(colKey => {
                totals[colKey] = Object.values(results.contingency_table).reduce((sum, row) => sum + (row[colKey] || 0), 0);
            });
        }
        return totals;
    }, [results]);

    const grandTotal = useMemo(() => Object.values(rowTotals).reduce((sum, val) => sum + val, 0), [rowTotals]);

    if (!canRun || view === 'intro') return <IntroPage onLoadExample={onLoadExample!} />;

    const ProgressBar = () => (
        <div className="mb-8">
            <div className="flex items-center justify-between w-full gap-2">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!results);
                    const isCurrent = currentStep === step.id;
                    const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!results);
                    return (
                        <button key={step.id} onClick={() => isAccessible && goToStep(step.id)} disabled={!isAccessible}
                            className={`flex flex-col items-center gap-2 transition-all flex-1 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
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
            {/* 👇 1. Guide 컴포넌트 추가 */}
            <CrosstabGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Crosstabulation & Chi-Squared</h1>
                    <p className="text-muted-foreground mt-1">Analyze relationships between categorical variables.</p>
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
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div>
                                <div><CardTitle>Select Variables</CardTitle><CardDescription>Choose two categorical variables to analyze</CardDescription></div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Row Variable</Label>
                                    <Select value={rowVar} onValueChange={setRowVar}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select row variable" /></SelectTrigger>
                                        <SelectContent>{categoricalHeaders.map(h => (<SelectItem key={h} value={h} disabled={h === colVar}>{h}</SelectItem>))}</SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Will appear as rows in the table</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Column Variable</Label>
                                    <Select value={colVar} onValueChange={setColVar}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select column variable" /></SelectTrigger>
                                        <SelectContent>{categoricalHeaders.map(h => (<SelectItem key={h} value={h} disabled={h === rowVar}>{h}</SelectItem>))}</SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Will appear as columns in the table</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!rowVar || !colVar || rowVar === colVar}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div>
                                <div><CardTitle>Analysis Settings</CardTitle><CardDescription>Review the test configuration</CardDescription></div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-4">
                                <h4 className="font-medium text-sm">Test Configuration</h4>
                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2"><span className="text-muted-foreground">Row Variable:</span><Badge variant="secondary">{rowVar}</Badge></div>
                                    <div className="flex items-center gap-2"><span className="text-muted-foreground">Column Variable:</span><Badge variant="secondary">{colVar}</Badge></div>
                                </div>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">What Will Be Tested</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Chi-Squared Test:</strong> Tests if the two variables are independent</p>
                                    <p>• <strong className="text-foreground">Cramer's V:</strong> Measures the strength of association (0 to 1)</p>
                                    <p>• <strong className="text-foreground">Null Hypothesis:</strong> The variables are independent (no relationship)</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div>
                                <div><CardTitle>Data Validation</CardTitle><CardDescription>Checking if your data is ready for analysis</CardDescription></div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (
                                    <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>
                                        {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
                                        <div><p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p></div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <Columns className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Pearson's Chi-Squared test will be performed.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div>
                                <div><CardTitle>Result Summary</CardTitle><CardDescription>What your data reveals about {rowVar} and {colVar}</CardDescription></div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className={`rounded-xl p-6 space-y-4 border ${results.chi_squared.p_value < 0.05 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${results.chi_squared.p_value < 0.05 ? 'text-primary' : 'text-rose-600'}`} />Key Findings</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3"><span className={`font-bold ${results.chi_squared.p_value < 0.05 ? 'text-primary' : 'text-rose-600'}`}>•</span><p className="text-sm">{results.chi_squared.p_value < 0.05 ? <><strong>{rowVar}</strong> and <strong>{colVar}</strong> are connected! The distribution changes depending on the category.</> : <><strong>{rowVar}</strong> and <strong>{colVar}</strong> appear to be independent — knowing one doesn't help predict the other.</>}</p></div>
                                    <div className="flex items-start gap-3"><span className={`font-bold ${results.chi_squared.p_value < 0.05 ? 'text-primary' : 'text-rose-600'}`}>•</span><p className="text-sm">{results.cramers_v >= 0.5 ? <>The connection is <strong>strong</strong> — these categories are tightly linked.</> : results.cramers_v >= 0.3 ? <>The connection is <strong>moderate</strong> — there's a noticeable pattern.</> : results.cramers_v >= 0.1 ? <>The connection is <strong>weak but real</strong> — a small pattern exists.</> : <>The connection is <strong>very weak</strong> — practically independent.</>}</p></div>
                                    <div className="flex items-start gap-3"><span className={`font-bold ${results.chi_squared.p_value < 0.05 ? 'text-primary' : 'text-rose-600'}`}>•</span><p className="text-sm">We analyzed <strong>{grandTotal}</strong> observations across the categories.</p></div>
                                </div>
                            </div>
                            <div className={`rounded-xl p-5 border ${results.chi_squared.p_value < 0.05 && results.cramers_v >= 0.1 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                <div className="flex items-start gap-3">
                                    {results.chi_squared.p_value < 0.05 && results.cramers_v >= 0.1 ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />}
                                    <div>
                                        <p className="font-semibold">{results.chi_squared.p_value < 0.05 && results.cramers_v >= 0.3 ? "Strong Pattern Found!" : results.chi_squared.p_value < 0.05 && results.cramers_v >= 0.1 ? "Pattern Detected" : results.chi_squared.p_value < 0.05 ? "Weak Pattern Only" : "No Pattern Found"}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{results.chi_squared.p_value < 0.05 && results.cramers_v >= 0.3 ? `Use ${rowVar} to make better predictions about ${colVar}. This relationship is actionable.` : results.chi_squared.p_value < 0.05 && results.cramers_v >= 0.1 ? `There's a pattern worth noting, but it's not dominant. Consider this alongside other factors.` : results.chi_squared.p_value < 0.05 ? "The pattern exists but is too weak to be practically useful." : `Treat ${rowVar} and ${colVar} as separate factors — they don't influence each other.`}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Related?</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${results.chi_squared.p_value >= 0.05 ? 'text-rose-600 dark:text-rose-400' : ''}`}>{results.chi_squared.p_value < 0.05 ? 'Yes' : 'No'}</p><p className="text-xs text-muted-foreground">{results.chi_squared.p_value < 0.05 ? 'Confirmed' : 'Not confirmed'}</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Strength</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{(results.cramers_v * 100).toFixed(0)}%</p><p className="text-xs text-muted-foreground">{getEffectSizeInterpretation(results.cramers_v).label}</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Confidence</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.chi_squared.p_value < 0.001 ? '>99.9%' : results.chi_squared.p_value < 0.01 ? '>99%' : results.chi_squared.p_value < 0.05 ? '>95%' : '<95%'}</p><p className="text-xs text-muted-foreground">{results.chi_squared.p_value < 0.05 ? 'Reliable' : 'Uncertain'}</p></div></CardContent></Card>
                                <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Sample Size</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{grandTotal}</p><p className="text-xs text-muted-foreground">observations</p></div></CardContent></Card>
                            </div>
                            <div className="flex items-center justify-center gap-1 py-2">
                                <span className="text-sm text-muted-foreground mr-2">Connection Strength:</span>
                                {[1, 2, 3, 4, 5].map(star => (<span key={star} className={`text-lg ${(results.cramers_v >= 0.5 && star <= 5) || (results.cramers_v >= 0.3 && star <= 4) || (results.cramers_v >= 0.2 && star <= 3) || (results.cramers_v >= 0.1 && star <= 2) || star <= 1 ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div>
                                <div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Simple explanation of how we reached this result</CardDescription></div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                    <div><h4 className="font-semibold mb-1">What We Checked</h4><p className="text-sm text-muted-foreground">We examined <strong className="text-foreground">{grandTotal} records</strong> to determine whether <strong className="text-foreground">{rowVar}</strong> and <strong className="text-foreground">{colVar}</strong> are associated. Specifically, we tested if the distribution of {colVar} differs across {rowVar} categories.</p></div>
                                </div>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                    <div><h4 className="font-semibold mb-1">What Would "No Connection" Look Like?</h4><p className="text-sm text-muted-foreground">If <strong className="text-foreground">{rowVar}</strong> and <strong className="text-foreground">{colVar}</strong> were completely unrelated, we'd expect the combinations to follow simple proportions. We compared what we actually see against this "no connection" scenario.</p></div>
                                </div>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                    <div><h4 className="font-semibold mb-1">Is the Pattern Real or Random?</h4><p className="text-sm text-muted-foreground">{results.chi_squared.p_value < 0.05 ? <>The pattern we found is <strong className="text-foreground">too consistent to be coincidence</strong>. There's a real connection between these categories.</> : <>The pattern we see <strong className="text-foreground">could easily happen by chance</strong>. We can't confirm these are truly connected.</>}</p></div>
                                </div>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                    <div><h4 className="font-semibold mb-1">How Useful Is This Connection?</h4><p className="text-sm text-muted-foreground">{results.cramers_v >= 0.5 ? <>This is a <strong className="text-foreground">strong connection</strong>. Knowing someone's {rowVar} tells you a lot about their likely {colVar}.</> : results.cramers_v >= 0.3 ? <>This is a <strong className="text-foreground">useful connection</strong>. It won't predict perfectly, but it helps narrow things down.</> : results.cramers_v >= 0.1 ? <>This is a <strong className="text-foreground">weak connection</strong>. It's real, but don't rely heavily on it for predictions.</> : <>The connection is <strong className="text-foreground">too weak to use</strong>. Even if it's statistically real, it's not helpful for decisions.</>}</p></div>
                                </div>
                            </div>
                            <div className={`rounded-xl p-5 border ${results.chi_squared.p_value < 0.05 && results.cramers_v >= 0.1 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                <h4 className="font-semibold mb-2 flex items-center gap-2">{results.chi_squared.p_value < 0.05 && results.cramers_v >= 0.3 ? <><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line: Use This Connection</> : results.chi_squared.p_value < 0.05 && results.cramers_v >= 0.1 ? <><Info className="w-5 h-5 text-primary" /> Bottom Line: Note the Pattern</> : results.chi_squared.p_value < 0.05 ? <><Info className="w-5 h-5 text-amber-600" /> Bottom Line: Weak But Real</> : <><AlertTriangle className="w-5 h-5 text-rose-600" /> Bottom Line: Treat as Separate</>}</h4>
                                <p className="text-sm text-muted-foreground">{results.chi_squared.p_value < 0.05 && results.cramers_v >= 0.3 ? `When you know ${rowVar}, you can make better guesses about ${colVar}. Factor this into your strategy.` : results.chi_squared.p_value < 0.05 && results.cramers_v >= 0.1 ? `There's a pattern worth knowing, but don't put all your eggs in this basket.` : results.chi_squared.p_value < 0.05 ? "The connection exists but is too weak to drive decisions." : `Treat ${rowVar} and ${colVar} as independent factors. Knowing one doesn't help with the other.`}</p>
                            </div>
                            <div className="bg-muted/20 rounded-xl p-4">
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Connection Strength Guide</h4>
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt;10%</p><p className="text-muted-foreground">Negligible</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">10-30%</p><p className="text-muted-foreground">Weak</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">30-50%</p><p className="text-muted-foreground">Moderate</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt;50%</p><p className="text-muted-foreground">Strong</p></div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {currentStep === 6 && results && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full technical report</p></div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF Report<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b">
                            <h2 className="text-2xl font-bold">Crosstabulation Report</h2>
                            <p className="text-sm text-muted-foreground mt-1">{rowVar} × {colVar} | {new Date().toLocaleDateString()}</p>
                        </div>

                        <StatisticalSummaryCards results={results} />

                        {results.n_dropped !== undefined && results.n_dropped > 0 && (
                            <Card><CardContent className="pt-6"><Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Missing Values</AlertTitle><AlertDescription>{results.n_dropped} rows excluded due to missing values.</AlertDescription></Alert></CardContent></Card>
                        )}

                        <Card>
                            <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Statistical Summary</h3></div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            A chi-square test of independence was conducted to examine the relationship between {rowVar} and {colVar}. The analysis included {grandTotal} observations.
                                            {results.chi_squared.p_value < 0.05 ? (
                                                <> The results revealed a statistically significant association between the two variables, <span className="font-mono">χ²({results.chi_squared.degrees_of_freedom}, <em>N</em> = {grandTotal}) = {results.chi_squared.statistic.toFixed(2)}, <em>p</em> {results.chi_squared.p_value < 0.001 ? '< .001' : `= ${results.chi_squared.p_value.toFixed(3)}`}</span>. The effect size, as measured by Cramér's <em>V</em>, was {results.cramers_v.toFixed(3)}, indicating a {getEffectSizeInterpretation(results.cramers_v).label.toLowerCase()} association between {rowVar} and {colVar}.</>
                                            ) : (
                                                <> The results indicated no statistically significant association between the two variables, <span className="font-mono">χ²({results.chi_squared.degrees_of_freedom}, <em>N</em> = {grandTotal}) = {results.chi_squared.statistic.toFixed(2)}, <em>p</em> = {results.chi_squared.p_value.toFixed(3)}</span>. Cramér's <em>V</em> was {results.cramers_v.toFixed(3)}, suggesting a {getEffectSizeInterpretation(results.cramers_v).label.toLowerCase()} effect size.</>
                                            )}
                                        </p>
                                        {results.chi_squared.p_value < 0.05 && (
                                            <p className="text-sm leading-relaxed text-muted-foreground mt-3">
                                                These findings suggest that {rowVar} and {colVar} are not independent; the distribution of {colVar} varies systematically across different levels of {rowVar}.
                                                {results.cramers_v >= 0.3 ? ` Given the ${getEffectSizeInterpretation(results.cramers_v).label.toLowerCase()} effect size, this relationship may have practical significance for decision-making.` : ` However, the ${getEffectSizeInterpretation(results.cramers_v).label.toLowerCase()} effect size indicates that the practical significance of this relationship should be interpreted cautiously.`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Test Statistics</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Statistic</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        <TableRow><TableCell className="font-medium">Chi-Squared (χ²)</TableCell><TableCell className="text-right font-mono">{results.chi_squared.statistic.toFixed(3)}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">Degrees of Freedom</TableCell><TableCell className="text-right font-mono">{results.chi_squared.degrees_of_freedom}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">P-value</TableCell><TableCell className="text-right font-mono">{results.chi_squared.p_value < 0.001 ? '<.001' : results.chi_squared.p_value.toFixed(4)}<span className="ml-2 text-xs">{getSignificanceStars(results.chi_squared.p_value)}</span></TableCell></TableRow>
                                        <TableRow><TableCell className="font-medium">Cramer's V</TableCell><TableCell className="text-right font-mono">{results.cramers_v.toFixed(3)}</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {analysisResult?.plot && (
                            <Card>
                                <CardHeader><CardTitle>Distribution</CardTitle></CardHeader>
                                <CardContent className="flex justify-center"><Image src={analysisResult.plot} alt="Crosstabulation Visualization" width={800} height={500} className="rounded-md" /></CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader><CardTitle>Contingency Table</CardTitle><CardDescription>{rowVar} × {colVar}</CardDescription></CardHeader>
                            <CardContent>
                                <Tabs defaultValue="count">
                                    <TabsList className="grid w-full grid-cols-4 mb-4">
                                        <TabsTrigger value="count">Count</TabsTrigger>
                                        <TabsTrigger value="row">Row %</TabsTrigger>
                                        <TabsTrigger value="col">Column %</TabsTrigger>
                                        <TabsTrigger value="total">% of Total</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="count">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader><TableRow><TableHead className="font-bold">{rowVar} \ {colVar}</TableHead>{Object.keys(results.contingency_table[Object.keys(results.contingency_table)[0]]).map(col => (<TableHead key={col} className="text-center font-bold">{col}</TableHead>))}<TableHead className="text-center font-bold">Total</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {Object.entries(results.contingency_table).map(([rowKey, rowData]) => (<TableRow key={rowKey}><TableCell className="font-semibold">{rowKey}</TableCell>{Object.values(rowData).map((cellValue, index) => (<TableCell key={index} className="text-center font-mono">{cellValue}</TableCell>))}<TableCell className="text-center font-mono font-semibold">{rowTotals[rowKey]}</TableCell></TableRow>))}
                                                    <TableRow className="border-t-2"><TableCell className="font-bold">Total</TableCell>{Object.values(colTotals).map((total, index) => (<TableCell key={index} className="text-center font-mono font-semibold">{total}</TableCell>))}<TableCell className="text-center font-mono font-bold">{grandTotal}</TableCell></TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="row">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader><TableRow><TableHead className="font-bold">{rowVar} \ {colVar}</TableHead>{Object.keys(results.contingency_table[Object.keys(results.contingency_table)[0]]).map(col => (<TableHead key={col} className="text-center font-bold">{col}</TableHead>))}<TableHead className="text-center font-bold">Total</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {Object.entries(results.contingency_table).map(([rowKey, rowData]) => { const rowTotal = rowTotals[rowKey]; return (<TableRow key={rowKey}><TableCell className="font-semibold">{rowKey}</TableCell>{Object.values(rowData).map((cellValue, index) => (<TableCell key={index} className="text-center font-mono">{rowTotal > 0 ? (cellValue / rowTotal * 100).toFixed(1) : '0.0'}%</TableCell>))}<TableCell className="text-center font-mono font-semibold">100.0%</TableCell></TableRow>); })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="col">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader><TableRow><TableHead className="font-bold">{rowVar} \ {colVar}</TableHead>{Object.keys(results.contingency_table[Object.keys(results.contingency_table)[0]]).map(col => (<TableHead key={col} className="text-center font-bold">{col}</TableHead>))}</TableRow></TableHeader>
                                                <TableBody>
                                                    {Object.entries(results.contingency_table).map(([rowKey, rowData]) => (<TableRow key={rowKey}><TableCell className="font-semibold">{rowKey}</TableCell>{Object.entries(rowData).map(([colKey, cellValue], index) => { const colTotal = colTotals[colKey]; return (<TableCell key={index} className="text-center font-mono">{colTotal > 0 ? (cellValue / colTotal * 100).toFixed(1) : '0.0'}%</TableCell>); })}</TableRow>))}
                                                    <TableRow className="border-t-2"><TableCell className="font-bold">Total</TableCell>{Object.keys(colTotals).map((_, index) => (<TableCell key={index} className="text-center font-mono font-semibold">100.0%</TableCell>))}</TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="total">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader><TableRow><TableHead className="font-bold">{rowVar} \ {colVar}</TableHead>{Object.keys(results.contingency_table[Object.keys(results.contingency_table)[0]]).map(col => (<TableHead key={col} className="text-center font-bold">{col}</TableHead>))}<TableHead className="text-center font-bold">Total</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {Object.entries(results.contingency_table).map(([rowKey, rowData]) => (<TableRow key={rowKey}><TableCell className="font-semibold">{rowKey}</TableCell>{Object.values(rowData).map((cellValue, index) => (<TableCell key={index} className="text-center font-mono">{grandTotal > 0 ? (cellValue / grandTotal * 100).toFixed(1) : '0.0'}%</TableCell>))}<TableCell className="text-center font-mono font-semibold">{grandTotal > 0 ? (rowTotals[rowKey] / grandTotal * 100).toFixed(1) : '0.0'}%</TableCell></TableRow>))}
                                                    <TableRow className="border-t-2"><TableCell className="font-bold">Total</TableCell>{Object.keys(colTotals).map((colKey, index) => (<TableCell key={index} className="text-center font-mono font-semibold">{grandTotal > 0 ? (colTotals[colKey] / grandTotal * 100).toFixed(1) : '0.0'}%</TableCell>))}<TableCell className="text-center font-mono font-bold">100.0%</TableCell></TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                    
                    <div className="mt-4 flex justify-start">
                        <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                    </div>
                    </>
                )}
            </div>

            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />
            <GlossaryModal 
                isOpen={glossaryModalOpen} 
                onClose={() => setGlossaryModalOpen(false)} 
            />
        </div>
    );
}
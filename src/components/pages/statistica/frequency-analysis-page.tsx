'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { BarChart, AlertTriangle, Lightbulb, CheckCircle, Zap, HelpCircle, MoveRight, Settings, FileSearch, Users, BookOpen, PieChart, Grid3x3, Download, FileSpreadsheet, ImageIcon, Info, XCircle, TrendingUp, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, Loader2 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '../../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Statistical terms glossary for Frequency Analysis
const frequencyTermDefinitions: Record<string, string> = {
    "Frequency": "The count of how many times each unique value or category appears in a dataset. It represents the absolute number of occurrences.",
    "Relative Frequency": "The proportion of observations in each category, calculated as the frequency divided by the total number of observations. Often expressed as a percentage.",
    "Cumulative Frequency": "A running total of frequencies, showing the number of observations that fall at or below each value when data is ordered.",
    "Cumulative Percentage": "The running total of percentages, indicating what proportion of the data falls at or below each category. Reaches 100% at the final category.",
    "Mode": "The most frequently occurring value in a dataset. A distribution can have one mode (unimodal), two modes (bimodal), or multiple modes (multimodal).",
    "Frequency Distribution": "A summary of how often each value occurs in a dataset, typically displayed as a table or graph showing values and their corresponding frequencies.",
    "Frequency Table": "A tabular representation showing each unique value or category along with its frequency count, percentage, and often cumulative statistics.",
    "Bar Chart": "A graphical display of categorical data using rectangular bars where the length of each bar is proportional to the frequency or percentage of each category.",
    "Entropy": "A measure of uncertainty or randomness in the distribution. Higher entropy indicates more uniform distribution across categories; lower entropy indicates concentration in fewer categories.",
    "Normalized Entropy": "Entropy scaled to range from 0 to 1, calculated by dividing entropy by maximum possible entropy (log of number of categories). Values near 1 indicate uniform distribution.",
    "Maximum Entropy": "The theoretical maximum entropy possible given the number of categories, achieved when all categories have equal frequencies (uniform distribution).",
    "Frequency Ratio": "The ratio of the most common category's frequency to the second most common. High ratios indicate one dominant category; ratios near 1 suggest more balance.",
    "Category": "A distinct group or class into which observations can be classified. Categories are the unique values that a categorical variable can take.",
    "Categorical Variable": "A variable that takes on a limited number of distinct categories or groups. Can be nominal (no natural order) or ordinal (with natural order).",
    "Nominal Variable": "A categorical variable where categories have no inherent order or ranking. Examples: gender, color, country.",
    "Ordinal Variable": "A categorical variable where categories have a meaningful order but the differences between values are not necessarily equal. Examples: education level, satisfaction rating.",
    "Distribution Shape": "The overall pattern of how data is spread across categories. Can be uniform (equal frequencies), skewed (concentrated in some categories), or bimodal (two peaks).",
    "Uniform Distribution": "A distribution where all categories have approximately equal frequencies, resulting in high entropy and normalized entropy near 1.",
    "Skewed Distribution": "A distribution where frequencies are concentrated in one or few categories, with a long tail of less frequent categories. Results in low normalized entropy.",
    "Class Imbalance": "When some categories have significantly more observations than others. Important to detect for machine learning applications where it can affect model performance.",
    "Zero Variance": "When a variable has only one unique value (all observations are the same). Such variables provide no information for analysis and should typically be removed.",
    "Near-Zero Variance": "When a variable is dominated by a single category with very few observations in other categories. May cause problems in statistical modeling.",
    "Unique Categories": "The count of distinct values that appear in a categorical variable. Also called 'cardinality' of the variable.",
    "Missing Values": "Observations where no value is recorded for a variable. Important to identify as they can affect frequency calculations and subsequent analyses.",
    "Valid Percent": "The percentage calculated excluding missing values, showing the distribution among only the valid (non-missing) observations.",
    "Cross-tabulation": "A table showing the frequency distribution of two or more categorical variables simultaneously, revealing relationships between variables."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Frequency Analysis Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in frequency and distribution analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(frequencyTermDefinitions).map(([term, definition]) => (
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

interface FrequencyTableItem {
    Value: string | number;
    Frequency: number;
    Percentage: number;
    'Cumulative Percentage': number;
}

interface Insight {
    type: 'warning' | 'info';
    title: string;
    description: string;
}

interface VariableResult {
    table: FrequencyTableItem[];
    summary: { total_count: number; unique_categories: number; mode: string | number; entropy: number; max_entropy: number; normalized_entropy?: number; freq_ratio?: number | null; };
    insights?: Insight[];
    recommendations?: string[];
    plot: string;
    error?: string;
}

interface FullAnalysisResponse {
    results: { [key: string]: VariableResult };
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

const getInsightIcon = (insight: Insight) => {
    const title = insight.title.toLowerCase();
    if (title.includes('zero variance') || title.includes('near-zero')) return <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />;
    if (title.includes('skewed') || title.includes('imbalance')) return <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />;
    if (title.includes('balanced') || title.includes('uniform')) return <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />;
    if (insight.type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />;
    return <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />;
};

const getInsightBgColor = (insight: Insight) => {
    const title = insight.title.toLowerCase();
    if (title.includes('zero variance') || title.includes('near-zero')) return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800';
    if (title.includes('balanced') || title.includes('uniform')) return 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800';
    if (insight.type === 'warning') return 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800';
    return 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800';
};


// Frequency Analysis Guide Component
const FrequencyGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Frequency Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Frequency Analysis */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                What is Frequency Analysis?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Frequency analysis examines how often each category or value appears in your data. 
                It&apos;s the foundation for understanding <strong>categorical variables</strong> — 
                revealing patterns, dominant categories, and potential imbalances.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Core Concept:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Count how many times each unique value appears, then express as percentages. 
                    This simple technique answers: &quot;What&apos;s common? What&apos;s rare? How balanced is my data?&quot;
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use This Analysis?
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Use Frequency Analysis For:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>Exploring categorical data</strong> (gender, region, product type)</li>
                    <li>• <strong>Understanding sample composition</strong></li>
                    <li>• <strong>Detecting class imbalance</strong> before ML modeling</li>
                    <li>• <strong>Finding the mode</strong> (most common value)</li>
                    <li>• <strong>Data quality checks</strong> (unexpected categories, typos)</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Common Applications:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Survey response analysis</li>
                    <li>• Customer segmentation overview</li>
                    <li>• Product category distribution</li>
                    <li>• Demographic profiling</li>
                    <li>• Quality control (defect types)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Measures */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Grid3x3 className="w-4 h-4" />
                Key Measures Explained
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Frequency (Count)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The absolute number of times each category appears in the data.
                    <br/><em>Example: &quot;Male&quot; appears 150 times, &quot;Female&quot; appears 120 times.</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Relative Frequency (Percentage)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each category&apos;s count divided by total observations, expressed as a percentage.
                    <br/>Makes comparison easier when sample sizes differ.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Cumulative Frequency</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Running total of frequencies. Shows what proportion falls at or below each category 
                    (useful for ordinal data like age groups or satisfaction levels).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Mode</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The most frequently occurring category. A distribution can be unimodal (one peak), 
                    bimodal (two peaks), or multimodal (multiple peaks).
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Entropy */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Understanding Entropy
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Entropy measures how &quot;spread out&quot; or &quot;uncertain&quot; the distribution is across categories.
              </p>
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm text-primary">Normalized Entropy (0 to 1)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Entropy scaled to a 0-1 range for easy interpretation.
                </p>
                <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                  <div className="p-1 rounded bg-muted text-center">
                    <p className="font-medium">0</p>
                    <p className="text-muted-foreground">Zero variance</p>
                  </div>
                  <div className="p-1 rounded bg-muted text-center">
                    <p className="font-medium">0.1-0.5</p>
                    <p className="text-muted-foreground">Skewed</p>
                  </div>
                  <div className="p-1 rounded bg-muted text-center">
                    <p className="font-medium">0.5-0.9</p>
                    <p className="text-muted-foreground">Moderate</p>
                  </div>
                  <div className="p-1 rounded bg-muted text-center">
                    <p className="font-medium">~1.0</p>
                    <p className="text-muted-foreground">Uniform</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Low entropy</strong> = concentrated in few categories (imbalanced)
                <br/><strong>High entropy</strong> = spread evenly across categories (balanced)
              </p>
            </div>

            <Separator />

            {/* Distribution Patterns */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                Distribution Patterns to Watch
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20">
                  <p className="font-medium text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Balanced Distribution
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Categories have roughly similar frequencies. Good for most analyses.
                    <br/>Normalized entropy near 1.0.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Skewed Distribution
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    One or few categories dominate. Common in real data (e.g., rare diseases, fraud detection).
                    <br/>May need special handling in ML (resampling, class weights).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20">
                  <p className="font-medium text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Zero/Near-Zero Variance
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Almost all observations in one category. Variable provides little information.
                    <br/>Consider removing or investigating why.
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
                  <p className="font-medium text-sm text-primary mb-1">Check for Unexpected Values</p>
                  <p className="text-xs text-muted-foreground">
                    Look for typos, inconsistent capitalization, or categories that shouldn&apos;t exist 
                    (data entry errors).
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Consider Category Counts</p>
                  <p className="text-xs text-muted-foreground">
                    Too many categories? Consider grouping rare ones into &quot;Other.&quot;
                    <br/>Too few? Variable may lack discriminative power.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Report Missing Values</p>
                  <p className="text-xs text-muted-foreground">
                    Always note how many observations are missing. Calculate &quot;valid percent&quot; 
                    (excluding missing) separately.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Visualize with Bar Charts</p>
                  <p className="text-xs text-muted-foreground">
                    Tables show exact numbers; charts reveal patterns at a glance.
                    <br/>Order bars by frequency for easier comparison.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Frequency Ratio */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Frequency Ratio
              </h3>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-sm text-muted-foreground">
                  The ratio of the most common category to the second most common.
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="p-1 rounded bg-muted text-center">
                    <p className="font-medium">Ratio ≈ 1</p>
                    <p className="text-muted-foreground">Balanced top 2</p>
                  </div>
                  <div className="p-1 rounded bg-muted text-center">
                    <p className="font-medium">Ratio 2-5</p>
                    <p className="text-muted-foreground">Somewhat skewed</p>
                  </div>
                  <div className="p-1 rounded bg-muted text-center">
                    <p className="font-medium">Ratio &gt; 5</p>
                    <p className="text-muted-foreground">Highly dominant</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Frequency analysis is often the <strong>first step</strong> in 
                understanding categorical data. Before building models or testing hypotheses, know your data&apos;s composition. 
                Pay attention to imbalanced distributions — they can significantly affect model performance and require 
                special handling techniques like oversampling, undersampling, or class weights.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const freqExample = exampleDatasets.find(d => d.id === 'crosstab');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <BarChart className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Frequency Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Examine the distribution of categorical variables — count occurrences and spot patterns
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Grid3x3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Count & Proportion</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    See how often each category appears in your data
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <PieChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Visual Distribution</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Bar charts for easy comparison across categories
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Users className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Mode Detection</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Find the most common values automatically
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
                            Use frequency analysis to explore categorical data, understand sample composition, 
                            and check for imbalanced distributions before modeling.
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
                                        <span><strong>Categorical data:</strong> Text or discrete categories</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Any size:</strong> 10+ observations recommended</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Multiple variables:</strong> Analyze several at once</span>
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
                                        <span><strong>Counts:</strong> Frequency of each category</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Percentages:</strong> Relative proportions</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Balance:</strong> Detect skewed distributions</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {freqExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(freqExample)} size="lg">
                                <BarChart className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface FrequencyAnalysisPageProps {
    data: DataSet;
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function FrequencyAnalysisPage({ data, categoricalHeaders, onLoadExample }: FrequencyAnalysisPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [selectedVars, setSelectedVars] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Modal state for glossary
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && categoricalHeaders.length > 0, [data, categoricalHeaders]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ label: 'Variables selected', passed: selectedVars.length > 0, detail: `${selectedVars.length} variable(s) selected` });
        checks.push({ label: 'Adequate sample size', passed: data.length >= 10, detail: `n = ${data.length} (recommended: 10+)` });
        
        const zeroVarCount = selectedVars.filter(v => {
            const uniqueValues = new Set(data.map(row => row[v]).filter(val => val != null && val !== ''));
            return uniqueValues.size <= 1;
        }).length;
        checks.push({ label: 'Variables have variance', passed: zeroVarCount === 0, detail: zeroVarCount > 0 ? `${zeroVarCount} variable(s) have zero variance` : 'All variables have multiple categories' });
        
        return checks;
    }, [selectedVars, data]);

    const allValidationsPassed = useMemo(() => {
        return selectedVars.length > 0;
    }, [selectedVars]);

    useEffect(() => {
        if (!canRun) {
            setView('intro');
        } else {
            setSelectedVars(categoricalHeaders.slice(0, 3));
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, categoricalHeaders, canRun]);

    const handleVarSelectionChange = (header: string, checked: boolean) => {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(v => v !== header));
    };

    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) { runAnalysis(); } else if (currentStep < 6) { goToStep((currentStep + 1) as Step); } };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Frequency_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/frequency-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    selectedVars,
                    totalRows: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Frequency_Analysis_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, selectedVars, data.length, toast]);


    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csvContent = "FREQUENCY ANALYSIS\n\n";
        selectedVars.forEach(varName => {
            const result = analysisResult.results[varName];
            if (result && !result.error && result.table) {
                csvContent += `=== ${varName} ===\n`;
                const freqData = result.table.map(item => ({ Value: item.Value, Frequency: item.Frequency, Percentage: item.Percentage?.toFixed(2), Cumulative: item['Cumulative Percentage']?.toFixed(2) }));
                csvContent += Papa.unparse(freqData) + "\n\n";
            }
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Frequency_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, selectedVars, toast]);

    const runAnalysis = useCallback(async () => {
        if (selectedVars.length === 0) {
            toast({ variant: 'destructive', title: 'Please select at least one variable.' });
            return;
        }
        
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/frequency`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, variables: selectedVars })
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedVars, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

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

    // Get summary stats for Step 4
    const getSummaryStats = () => {
        if (!analysisResult) return null;
        let totalCategories = 0;
        let totalFreq = 0;
        const modes: string[] = [];
        
        selectedVars.forEach(varName => {
            const result = analysisResult.results[varName];
            if (result && !result.error) {
                totalCategories += result.summary.unique_categories;
                totalFreq += result.summary.total_count;
                modes.push(`${varName}: ${result.summary.mode}`);
            }
        });
        
        return { totalCategories, totalFreq, modes, avgCategoriesPerVar: Math.round(totalCategories / selectedVars.length) };
    };

    return (
        <div className="w-full max-w-5xl mx-auto">
            <FrequencyGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
    
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Frequency Analysis</h1>
                    <p className="text-muted-foreground mt-1">Distribution of categorical variables</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose categorical variables to analyze</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Categorical Variables ({selectedVars.length} selected)</Label>
                                <ScrollArea className="h-48 p-4 border rounded-xl bg-muted/30">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {categoricalHeaders.map(h => (
                                            <div key={h} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                <Checkbox id={`var-${h}`} checked={selectedVars.includes(h)} onCheckedChange={(c) => handleVarSelectionChange(h, c as boolean)} />
                                                <Label htmlFor={`var-${h}`} className="text-sm font-normal cursor-pointer truncate">{h}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                {selectedVars.length > 0 && (
                                    <div className="flex flex-wrap gap-1">{selectedVars.map(v => <Badge key={v} variant="secondary">{v}</Badge>)}</div>
                                )}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={selectedVars.length === 0}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Analysis Settings</CardTitle><CardDescription>Review configuration</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Configuration Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Variables:</strong> {selectedVars.join(', ')}</p>
                                    <p>• <strong className="text-foreground">Analysis Type:</strong> Frequency tables with percentages</p>
                                    <p>• <strong className="text-foreground">Visualizations:</strong> Bar charts for each variable</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />About Frequency Analysis</h4>
                                <p className="text-sm text-muted-foreground">Frequency analysis counts occurrences of each category and calculates percentages. It helps identify the most common values (mode) and detect imbalanced distributions.</p>
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
                                <BarChart className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Frequency tables and bar charts will be generated for {selectedVars.length} variable(s).</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && analysisResult && (() => {
                    const stats = getSummaryStats();
                    const hasWarnings = selectedVars.some(v => analysisResult.results[v]?.insights?.some(i => i.type === 'warning'));
                    const hasErrors = selectedVars.some(v => analysisResult.results[v]?.error);

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Frequency Analysis: {selectedVars.length} variable(s)</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${!hasErrors && !hasWarnings ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${!hasWarnings ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasWarnings ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Analyzed <strong>{selectedVars.length}</strong> categorical variable(s) with <strong>{data.length}</strong> observations.
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasWarnings ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Average <strong>{stats?.avgCategoriesPerVar}</strong> categories per variable.
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasWarnings ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Modes identified: {stats?.modes.slice(0, 2).map((m, i) => <span key={i}><strong>{m}</strong>{i < Math.min(1, (stats?.modes.length || 1) - 1) ? ', ' : ''}</span>)}{(stats?.modes.length || 0) > 2 && ` and ${(stats?.modes.length || 0) - 2} more`}.
                                        </p></div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${!hasWarnings ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {!hasWarnings ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{!hasWarnings ? "Analysis Complete!" : "Analysis Complete with Warnings"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {!hasWarnings ? "All variables analyzed successfully with no major issues." : "Check the detailed insights for potential issues."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Variables</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{selectedVars.length}</p><p className="text-xs text-muted-foreground">Analyzed</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Observations</p><Users className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{data.length}</p><p className="text-xs text-muted-foreground">Total</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Categories</p><Grid3x3 className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{stats?.totalCategories}</p><p className="text-xs text-muted-foreground">Total unique</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Status</p>{hasWarnings ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <CheckCircle className="h-4 w-4 text-green-600" />}</div><p className="text-2xl font-semibold">{hasWarnings ? 'Warnings' : 'Good'}</p><p className="text-xs text-muted-foreground">{hasWarnings ? 'Check insights' : 'No issues'}</p></div></CardContent></Card>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">View Details<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning - Variable-by-Variable Insights */}
                {currentStep === 5 && analysisResult && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Detailed Insights</CardTitle><CardDescription>Understanding your data distribution</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            {selectedVars.map((varName, idx) => {
                                const result = analysisResult.results[varName];
                                if (!result || result.error) return null;
                                
                                return (
                                    <div key={varName} className="bg-muted/30 rounded-xl p-5">
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">{idx + 1}</div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold mb-2">{varName}</h4>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">
                                                            <strong className="text-foreground">{result.summary.unique_categories}</strong> unique categories, 
                                                            Mode: <strong className="text-foreground">{String(result.summary.mode)}</strong>
                                                            {result.summary.normalized_entropy !== undefined && (
                                                                <>, Entropy: <strong className="text-foreground">{result.summary.normalized_entropy.toFixed(2)}</strong></>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        {result.insights && result.insights.length > 0 && (
                                                            <div className="space-y-1">
                                                                {result.insights.slice(0, 2).map((insight, i) => (
                                                                    <div key={i} className={`text-xs p-2 rounded border ${getInsightBgColor(insight)}`}>
                                                                        <div className="flex items-start gap-1">
                                                                            {getInsightIcon(insight)}
                                                                            <span><strong>{insight.title}:</strong> {insight.description}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Analyzed {selectedVars.length} categorical variable(s). Check individual insights for any imbalanced distributions or unusual patterns that may affect downstream analysis.
                                </p>
                            </div>

                            <div className="bg-muted/20 rounded-xl p-4">
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Entropy Guide</h4>
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.0</p><p className="text-muted-foreground">Zero variance</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.1-0.5</p><p className="text-muted-foreground">Skewed</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">0.5-0.9</p><p className="text-muted-foreground">Moderate</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">~1.0</p><p className="text-muted-foreground">Uniform</p></div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && analysisResult && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full frequency tables and visualizations</p></div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}>  <FileText className="mr-2 h-4 w-4" />Word Document </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div ref={resultsRef} data-results-container className="space-y-6 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Frequency Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">Variables: {selectedVars.join(', ')} | n = {data.length} | {new Date().toLocaleDateString()}</p></div>
                        
                        {selectedVars.map(varName => {
                            const result = analysisResult.results[varName];
                            if (!result || result.error) {
                                return (
                                    <Card key={varName}>
                                        <CardHeader><CardTitle>{varName}</CardTitle></CardHeader>
                                        <CardContent>
                                            <Alert variant="destructive">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle>Error</AlertTitle>
                                                <AlertDescription>{result?.error || 'Unknown error'}</AlertDescription>
                                            </Alert>
                                        </CardContent>
                                    </Card>
                                );
                            }
                            
                            return (
                                <Card key={varName}>
                                    <CardHeader><CardTitle>{varName}</CardTitle><CardDescription>Mode: {String(result.summary.mode)} | {result.summary.unique_categories} categories | n = {result.summary.total_count}</CardDescription></CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid lg:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <Card>
                                                    <CardHeader className="pb-2"><CardTitle className="text-lg">Summary Statistics</CardTitle></CardHeader>
                                                    <CardContent>
                                                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                                            <dt className="text-muted-foreground">Total Count</dt><dd className="font-mono">{result.summary.total_count}</dd>
                                                            <dt className="text-muted-foreground">Unique Categories</dt><dd className="font-mono">{result.summary.unique_categories}</dd>
                                                            <dt className="text-muted-foreground">Mode</dt><dd className="font-mono">{String(result.summary.mode)}</dd>
                                                            {result.summary.normalized_entropy !== undefined && (<><dt className="text-muted-foreground">Normalized Entropy</dt><dd className="font-mono">{result.summary.normalized_entropy.toFixed(3)}</dd></>)}
                                                            {result.summary.freq_ratio !== undefined && result.summary.freq_ratio !== null && (<><dt className="text-muted-foreground">Frequency Ratio</dt><dd className="font-mono">{result.summary.freq_ratio.toFixed(2)}</dd></>)}
                                                        </dl>
                                                    </CardContent>
                                                </Card>
                                                
                                                {result.insights && result.insights.length > 0 && (
                                                    <Card>
                                                        <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" />Insights</CardTitle></CardHeader>
                                                        <CardContent>
                                                            <div className="space-y-2">
                                                                {result.insights.map((insight, i) => (
                                                                    <div key={i} className={`p-3 rounded-lg border ${getInsightBgColor(insight)}`}>
                                                                        <div className="flex items-start gap-2">{getInsightIcon(insight)}<div><p className="font-medium text-sm">{insight.title}</p><p className="text-sm text-muted-foreground mt-1">{insight.description}</p></div></div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {result.recommendations && result.recommendations.length > 0 && (
                                                    <Card>
                                                        <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Recommendations</CardTitle></CardHeader>
                                                        <CardContent>
                                                            <ul className="space-y-2 text-sm">{result.recommendations.map((rec, i) => (<li key={i} className="flex items-start gap-2"><MoveRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span>{rec}</span></li>))}</ul>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                            </div>
                                            <div>
                                                <img src={result.plot} alt={`Bar chart for ${varName}`} className="w-full rounded-md border" />
                                            </div>
                                        </div>
                                        <Card>
                                            <CardHeader className="pb-2"><CardTitle className="text-lg">Frequency Table</CardTitle></CardHeader>
                                            <CardContent>
                                                <ScrollArea className="h-64">
                                                    <Table>
                                                        <TableHeader><TableRow><TableHead>Value</TableHead><TableHead className="text-right">Frequency</TableHead><TableHead className="text-right">%</TableHead><TableHead className="text-right">Cumulative %</TableHead></TableRow></TableHeader>
                                                        <TableBody>
                                                            {result.table.map((row, i) => (
                                                                <TableRow key={i}>
                                                                    <TableCell>{String(row.Value)}</TableCell>
                                                                    <TableCell className="text-right font-mono">{row.Frequency}</TableCell>
                                                                    <TableCell className="text-right font-mono">{row.Percentage.toFixed(1)}%</TableCell>
                                                                    <TableCell className="text-right font-mono">{row['Cumulative Percentage'].toFixed(1)}%</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </ScrollArea>
                                            </CardContent>
                                        </Card>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}
            </div>

        </div>
    );
}
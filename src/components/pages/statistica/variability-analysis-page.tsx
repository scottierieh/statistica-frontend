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
import { AlertTriangle, HelpCircle, Settings, FileSearch, BarChart, BookOpen, CheckCircle, Zap, Activity, TrendingUp, Target, Database, Settings2, Shield, ChevronRight, ChevronLeft, Check, CheckCircle2, ArrowRight, ChevronDown, FileText, Sparkles, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '../../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-dm6treznqq-du.a.run.app';

// Statistical terms glossary for Variability Analysis
const variabilityTermDefinitions: Record<string, string> = {
    "Variability": "The degree to which data points in a dataset differ from each other and from the central tendency. Also called dispersion or spread.",
    "Range": "The difference between the maximum and minimum values in a dataset. Simple but sensitive to outliers. Range = Max - Min.",
    "Interquartile Range (IQR)": "The range of the middle 50% of data, calculated as Q3 - Q1. More robust to outliers than range and represents the spread of the central portion of data.",
    "Coefficient of Variation (CV)": "A standardized measure of dispersion calculated as (Standard Deviation / Mean) × 100%. Allows comparison of variability across variables with different units or scales.",
    "Standard Deviation (SD)": "The average distance of data points from the mean. Measures how spread out the data is around the average value.",
    "Variance": "The average of squared deviations from the mean. It's the square of the standard deviation and measures overall data spread.",
    "Mean": "The arithmetic average of all values, calculated by summing all values and dividing by the count. Sensitive to outliers.",
    "Median": "The middle value when data is sorted. More robust to outliers than the mean and represents the 50th percentile.",
    "Quartiles": "Values that divide data into four equal parts. Q1 (25th percentile), Q2 (median, 50th), and Q3 (75th percentile).",
    "Q1 (First Quartile)": "The 25th percentile - 25% of data falls below this value. Also called the lower quartile.",
    "Q3 (Third Quartile)": "The 75th percentile - 75% of data falls below this value. Also called the upper quartile.",
    "Percentile": "A value below which a given percentage of observations fall. The median is the 50th percentile.",
    "Outlier": "A data point that lies significantly outside the typical range of values. Often defined as values beyond 1.5 × IQR from Q1 or Q3.",
    "Robustness": "The degree to which a statistical measure is unaffected by outliers or extreme values. IQR is more robust than range.",
    "Dispersion": "Another term for variability - how spread out or scattered the data values are from the center.",
    "Homogeneity": "When data values are similar to each other, showing low variability. Opposite of heterogeneity.",
    "Heterogeneity": "When data values are diverse or dissimilar, showing high variability. Opposite of homogeneity.",
    "Consistency": "Low variability in measurements or data, indicating reliability and predictability. Lower CV indicates higher consistency.",
    "Relative Variability": "Variability expressed relative to the mean, allowing comparison across different scales. CV is a measure of relative variability.",
    "Absolute Variability": "Variability expressed in the original units of measurement. Range, IQR, and standard deviation are absolute measures.",
    "Scale Independence": "A property of measures like CV that allows comparison across variables with different units or magnitudes.",
    "Spread": "A general term for how data is distributed across its range. Synonymous with variability or dispersion.",
    "Central Tendency": "Measures that describe the center or typical value of a dataset: mean, median, and mode.",
    "Skewness": "Asymmetry in data distribution. Positive skew has a longer right tail; negative skew has a longer left tail.",
    "Distribution Shape": "The overall pattern of how data values are spread, including symmetry, peaks, and tails.",
    "Box Plot (Box-and-Whisker)": "A graphical display showing minimum, Q1, median, Q3, maximum, and outliers. Excellent for visualizing variability.",
    "Five-Number Summary": "The minimum, Q1, median, Q3, and maximum values that summarize a dataset's distribution and spread."
};

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Variability Analysis Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in variability and dispersion analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(variabilityTermDefinitions).map(([term, definition]) => (
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

interface VariabilityResult {
    variable: string;
    range: number;
    iqr: number;
    cv: number;
}

interface FullAnalysisResponse {
    results: VariabilityResult[];
    interpretation: string;
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

const getCVInterpretation = (cv: number) => {
    if (cv < 10) return 'Very Low';
    if (cv < 20) return 'Low';
    if (cv < 30) return 'Moderate';
    if (cv < 50) return 'High';
    return 'Very High';
};

// Statistical Summary Cards
const StatisticalSummaryCards = ({ results }: { results: VariabilityResult[] }) => {
    const avgCV = results.reduce((sum, r) => sum + r.cv, 0) / results.length;
    const minCV = Math.min(...results.map(r => r.cv));
    const maxCV = Math.max(...results.map(r => r.cv));
    const mostConsistent = results.find(r => r.cv === minCV);
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Variables</p><Activity className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.length}</p><p className="text-xs text-muted-foreground">Analyzed</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Avg CV</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{avgCV.toFixed(1)}%</p><p className="text-xs text-muted-foreground">{getCVInterpretation(avgCV)}</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">CV Range</p><BarChart className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{minCV.toFixed(1)} - {maxCV.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Min to Max</p></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Most Consistent</p><Target className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold truncate">{mostConsistent?.variable || 'N/A'}</p><p className="text-xs text-muted-foreground">CV = {minCV.toFixed(1)}%</p></div></CardContent></Card>
        </div>
    );
};

// Variability Analysis Guide Component
const VariabilityGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Variability Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Variability Analysis */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                What is Variability Analysis?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Variability analysis measures how <strong>spread out</strong> or <strong>dispersed</strong> your data is. 
                It answers: &quot;How consistent are my values? How much do they differ from each other and from the average?&quot;
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Why It Matters:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Low variability = consistent, predictable, reliable data.
                    <br/>High variability = inconsistent, unpredictable — may need investigation.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Key Measures */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Key Variability Measures
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Range (Max - Min)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The simplest measure — full spread from lowest to highest value.
                    <br/><strong className="text-amber-600">Limitation:</strong> Very sensitive to outliers. 
                    One extreme value can dramatically inflate the range.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Interquartile Range (IQR = Q3 - Q1)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The range of the <strong>middle 50%</strong> of data. Q1 = 25th percentile, Q3 = 75th percentile.
                    <br/><strong className="text-green-600">Advantage:</strong> Robust to outliers — ignores extreme values.
                    <br/><em>Better for skewed distributions or data with outliers.</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Coefficient of Variation (CV)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    CV = (Standard Deviation / Mean) × 100%
                    <br/><strong className="text-green-600">Key Advantage:</strong> Standardized — allows comparison across 
                    variables with different units or scales.
                    <br/><em>Lower CV = more consistent. Use CV to compare variability fairly.</em>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Standard Deviation (SD)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average distance from the mean. Shows how tightly values cluster around the average.
                    <br/>Smaller SD = values close to mean. Larger SD = values spread widely.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* CV Interpretation */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                CV Interpretation Guide
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                The Coefficient of Variation (CV) is the most useful measure for comparing consistency across variables.
              </p>
              <div className="grid grid-cols-5 gap-2 text-xs">
                <div className="p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
                  <p className="font-medium">&lt; 10%</p>
                  <p className="text-muted-foreground">Very Low</p>
                  <p className="text-green-600 text-[10px]">Highly consistent</p>
                </div>
                <div className="p-2 rounded bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-center">
                  <p className="font-medium">10-20%</p>
                  <p className="text-muted-foreground">Low</p>
                  <p className="text-green-600 text-[10px]">Good consistency</p>
                </div>
                <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-center">
                  <p className="font-medium">20-30%</p>
                  <p className="text-muted-foreground">Moderate</p>
                  <p className="text-amber-600 text-[10px]">Acceptable</p>
                </div>
                <div className="p-2 rounded bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 text-center">
                  <p className="font-medium">30-50%</p>
                  <p className="text-muted-foreground">High</p>
                  <p className="text-orange-600 text-[10px]">Investigate</p>
                </div>
                <div className="p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-center">
                  <p className="font-medium">&gt; 50%</p>
                  <p className="text-muted-foreground">Very High</p>
                  <p className="text-red-600 text-[10px]">Concern</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <em>Context matters:</em> What&apos;s &quot;acceptable&quot; depends on your field. 
                Laboratory measurements may require CV &lt; 5%, while survey responses may tolerate CV &gt; 30%.
              </p>
            </div>

            <Separator />

            {/* Range vs IQR */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                When to Use Range vs IQR
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Use Range When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Data has no outliers</li>
                    <li>• You need the full spread</li>
                    <li>• Simple communication is needed</li>
                    <li>• Data is normally distributed</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Use IQR When:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Data has outliers or extreme values</li>
                    <li>• Data is skewed (not symmetric)</li>
                    <li>• You want robust spread measure</li>
                    <li>• Creating box plots</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Common Use Cases */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Common Applications
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Quality Control</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Monitor manufacturing consistency. Low CV indicates reliable, uniform products.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Financial Analysis</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Compare volatility of returns. Higher CV = higher risk.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Research Reliability</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assess measurement precision. Low CV indicates reliable instruments.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Process Improvement</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Identify inconsistent processes. High CV variables need attention.
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
                  <p className="font-medium text-sm text-primary mb-1">Use CV for Comparison</p>
                  <p className="text-xs text-muted-foreground">
                    When comparing variables with different units (e.g., height in cm vs weight in kg), 
                    only CV allows fair comparison.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Report Multiple Measures</p>
                  <p className="text-xs text-muted-foreground">
                    Range alone can be misleading. Always include IQR or SD for a complete picture.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Check for Outliers</p>
                  <p className="text-xs text-muted-foreground">
                    If Range &gt;&gt; IQR, outliers are likely present. Investigate before drawing conclusions.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Consider Context</p>
                  <p className="text-xs text-muted-foreground">
                    High variability isn&apos;t always bad. Some processes naturally vary more than others.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Warnings */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Important Considerations
              </h3>
              <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="font-medium text-sm text-amber-700 dark:text-amber-400">CV Limitation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  CV is <strong>only meaningful for ratio scales</strong> (data with a true zero point). 
                  Don&apos;t use CV for temperature in Celsius/Fahrenheit, pH values, or other interval scales.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 mt-2">
                <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Mean Near Zero</p>
                <p className="text-xs text-muted-foreground mt-1">
                  If the mean is close to zero, CV becomes unstable and can be extremely large 
                  even with small absolute variability.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Variability analysis helps you understand 
                <strong> consistency and reliability</strong>. Lower variability usually means more predictable outcomes. 
                Use CV to compare across different scales, IQR for robust spread, and always consider the context 
                of what you&apos;re measuring. High variability isn&apos;t inherently bad — it just signals where 
                to look more closely.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'ipa-restaurant');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Activity className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Variability Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Compare dispersion and consistency across multiple variables
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Range & IQR</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Measure spread with range and interquartile range
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Coefficient of Variation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Standardized comparison across different scales
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Consistency Check</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify most stable and volatile variables
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
                            Assess consistency and predictability of different variables. 
                            Lower variability indicates more stable processes and reliable measurements.
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
                                        <span><strong>Numeric data:</strong> Two or more variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 10 observations</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Comparable scales:</strong> CV enables cross-comparison</span>
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
                                        <span><strong>Range:</strong> Full spread (sensitive to outliers)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>IQR:</strong> Robust middle 50% spread</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>CV:</strong> Lower = more consistent</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <Activity className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface VariabilityAnalysisPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function VariabilityAnalysisPage({ data, numericHeaders, onLoadExample }: VariabilityAnalysisPageProps) {
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

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({ label: 'At least 2 variables selected', passed: selectedVars.length >= 2, detail: `${selectedVars.length} variable(s) selected` });
        checks.push({ label: 'Adequate sample size', passed: data.length >= 10, detail: `n = ${data.length} (recommended: 10+)` });
        
        const missingCount = selectedVars.reduce((count, varName) => {
            return count + data.filter((row: any) => row[varName] == null || row[varName] === '' || isNaN(Number(row[varName]))).length;
        }, 0);
        checks.push({ label: 'No excessive missing values', passed: missingCount < data.length * selectedVars.length * 0.1, detail: missingCount > 0 ? `${missingCount} missing values` : 'No missing values' });
        
        return checks;
    }, [selectedVars, data]);

    const allValidationsPassed = useMemo(() => {
        return selectedVars.length >= 2;
    }, [selectedVars]);

    useEffect(() => {
        if (!canRun) {
            setView('intro');
        } else {
            setSelectedVars(numericHeaders.slice(0, Math.min(5, numericHeaders.length)));
            setView('main');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, canRun]);

    const handleVarSelectionChange = (header: string, checked: boolean) => {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(v => v !== header));
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
            link.download = `Variability_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        let csvContent = "VARIABILITY ANALYSIS\n\n";
        const tableData = analysisResult.results.map(r => ({ Variable: r.variable, Range: r.range.toFixed(2), IQR: r.iqr.toFixed(2), CV_Percent: r.cv.toFixed(1) }));
        csvContent += Papa.unparse(tableData) + "\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Variability_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "Download Started" });
    }, [analysisResult, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/variability-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    interpretation: analysisResult.interpretation,
                    selectedVars,
                    totalRows: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Variability_Analysis_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, selectedVars, data.length, toast]);


    const handleAnalysis = useCallback(async () => {
        if (selectedVars.length < 2) {
            toast({ variant: 'destructive', title: 'Please select at least 2 variables.' });
            return;
        }
        
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/variability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, variables: selectedVars })
            });

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

    const results = analysisResult?.results;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep;
                    return (
                        <button key={step.id} onClick={() => isClickable && goToStep(step.id as Step)} disabled={!isClickable}
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
            <VariabilityGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
    
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Variability Analysis</h1>
                    <p className="text-muted-foreground mt-1">Compare dispersion across variables</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose numeric variables to compare (min 2)</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Numeric Variables ({selectedVars.length} selected)</Label>
                                <ScrollArea className="h-48 p-4 border rounded-xl bg-muted/30">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {numericHeaders.map(h => (
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
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={selectedVars.length < 2}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
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
                                    <p>• <strong className="text-foreground">Measures:</strong> Range, IQR, Coefficient of Variation (CV)</p>
                                    <p>• <strong className="text-foreground">Sample Size:</strong> {data.length} observations</p>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />About Variability Measures</h4>
                                <p className="text-sm text-muted-foreground">
                                    <strong>Range</strong> = Max - Min (sensitive to outliers). 
                                    <strong> IQR</strong> = Q3 - Q1 (robust, middle 50%). 
                                    <strong> CV</strong> = (SD/Mean) × 100% (standardized, lower = more consistent).
                                </p>
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
                                <Activity className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Will calculate Range, IQR, and CV for {selectedVars.length} variables.</p>
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
                {currentStep === 4 && results && (() => {
                    const avgCV = results.reduce((sum, r) => sum + r.cv, 0) / results.length;
                    const minCV = Math.min(...results.map(r => r.cv));
                    const maxCV = Math.max(...results.map(r => r.cv));
                    const mostConsistent = results.find(r => r.cv === minCV);
                    const leastConsistent = results.find(r => r.cv === maxCV);
                    const isGood = avgCV < 30;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Variability Analysis: {selectedVars.length} variables</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Average CV = <strong>{avgCV.toFixed(1)}%</strong> ({getCVInterpretation(avgCV)} variability).
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Most consistent: <strong>{mostConsistent?.variable}</strong> (CV = {minCV.toFixed(1)}%).
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${isGood ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Least consistent: <strong>{leastConsistent?.variable}</strong> (CV = {maxCV.toFixed(1)}%).
                                        </p></div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{isGood ? "Good Overall Consistency" : "High Variability Detected"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isGood ? "Most variables show acceptable levels of consistency." : "Some variables show high variability - may need investigation."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <StatisticalSummaryCards results={results} />

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Consistency Rating:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = avgCV < 10 ? 5 : avgCV < 20 ? 4 : avgCV < 30 ? 3 : avgCV < 50 ? 2 : 1;
                                        return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;
                                    })}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">View Details<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (() => {
                    const avgCV = results.reduce((sum, r) => sum + r.cv, 0) / results.length;
                    const sortedByCV = [...results].sort((a, b) => a.cv - b.cv);
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Understanding variability measures</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Understanding CV</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Coefficient of Variation (CV) = (Standard Deviation / Mean) × 100%. 
                                                It allows comparing variability across variables with different scales and units.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Variable Ranking (by consistency)</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {sortedByCV.slice(0, 3).map((r, i) => (
                                                    <span key={r.variable}>{i + 1}. <strong className="text-foreground">{r.variable}</strong> (CV={r.cv.toFixed(1)}%){i < 2 ? ', ' : ''}</span>
                                                ))}
                                                {results.length > 3 && ` ... and ${results.length - 3} more`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Range vs IQR</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Range captures the full spread but is sensitive to outliers. 
                                                IQR (middle 50%) is more robust and better for skewed distributions.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Recommendation</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {avgCV < 20 
                                                    ? 'Overall good consistency. Variables with lower CV are more predictable and reliable for analysis.' 
                                                    : avgCV < 40 
                                                    ? 'Moderate variability. Focus on high-CV variables to understand sources of inconsistency.' 
                                                    : 'High variability detected. Investigate outliers and consider data transformations.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        Analyzed {results.length} variables. Average CV = {avgCV.toFixed(1)}% ({getCVInterpretation(avgCV)}). 
                                        Most consistent: {sortedByCV[0]?.variable}, Least consistent: {sortedByCV[sortedByCV.length - 1]?.variable}.
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />CV Interpretation Guide</h4>
                                    <div className="grid grid-cols-5 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&lt; 10%</p><p className="text-muted-foreground">Very Low</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">10-20%</p><p className="text-muted-foreground">Low</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">20-30%</p><p className="text-muted-foreground">Moderate</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">30-50%</p><p className="text-muted-foreground">High</p></div>
                                        <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">&gt; 50%</p><p className="text-muted-foreground">Very High</p></div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && results && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full variability metrics</p></div>
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
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Variability Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">Variables: {selectedVars.join(', ')} | n = {data.length} | {new Date().toLocaleDateString()}</p></div>
                        
                        <StatisticalSummaryCards results={results} />
                        
                        {/* APA-style Summary */}
                        <Card>
                            <CardHeader><CardTitle>Statistical Summary</CardTitle></CardHeader>
                            <CardContent>
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold">Analysis Summary</h3>
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            Variability analysis was conducted on {results.length} numeric variables 
                                            (<em>N</em> = {data.length}). The coefficient of variation (CV) ranged from 
                                            {Math.min(...results.map(r => r.cv)).toFixed(1)}% to {Math.max(...results.map(r => r.cv)).toFixed(1)}%, 
                                            with an average of {(results.reduce((s, r) => s + r.cv, 0) / results.length).toFixed(1)}%.
                                        </p>
                                        {analysisResult?.interpretation && (
                                            <div className="mt-3 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: analysisResult.interpretation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}} />
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Results Table */}
                        <Card>
                            <CardHeader><CardTitle>Variability Metrics</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Variable</TableHead>
                                            <TableHead className="text-right">Range</TableHead>
                                            <TableHead className="text-right">IQR</TableHead>
                                            <TableHead className="text-right">CV (%)</TableHead>
                                            <TableHead className="text-center">Interpretation</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map(res => (
                                            <TableRow key={res.variable}>
                                                <TableCell className="font-medium">{res.variable}</TableCell>
                                                <TableCell className="text-right font-mono">{res.range.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono">{res.iqr.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono">{res.cv.toFixed(1)}%</TableCell>
                                                <TableCell className="text-center"><Badge variant={res.cv < 20 ? 'outline' : res.cv < 40 ? 'secondary' : 'destructive'}>{getCVInterpretation(res.cv)}</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter>
                                <p className="text-sm text-muted-foreground">CV = (Standard Deviation / Mean) × 100%. Lower CV indicates more consistency.</p>
                            </CardFooter>
                        </Card>
                    </div>
                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}
            </div>


        </div>
    );
}

'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, ShieldCheck, Settings2, CheckCircle2, FileSearch, HelpCircle, CheckCircle, Gauge, Target, BarChart3, Hash, Activity, Lightbulb, BookOpen, Download, FileSpreadsheet, ImageIcon, Database, Shield, FileText, ChevronRight, ChevronLeft, Sparkles, Check, ArrowRight, ChevronDown, FileCode, FileType, Info } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import Image from 'next/image';
import Papa from 'papaparse';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";


const metricDefinitions: Record<string, string> = {
    cronbachs_alpha: "A measure of internal consistency ranging from 0 to 1. Higher values indicate that items measure the same underlying construct more consistently. ≥0.7 is generally acceptable for research.",
    internal_consistency: "The degree to which all items in a scale measure the same construct. High internal consistency means responses to items are correlated.",
    item_total_correlation: "Corrected item-total correlation. How strongly each item correlates with the total score (excluding itself). Values ≥0.3 indicate good item performance.",
    alpha_if_deleted: "What Cronbach's alpha would be if this item were removed. If higher than current alpha, removing the item would improve reliability.",
    inter_item_correlation: "The average correlation between all pairs of items. Ideal range is 0.2-0.4 (related but not redundant).",
    sem: "Standard Error of Measurement. Estimates the amount of error in individual scores. Lower values indicate more precise measurement. SEM = SD × √(1-α).",
    confidence_interval: "A range of values that likely contains the true population alpha. A 95% CI means we're 95% confident the true alpha falls within this range.",
    scale_mean: "The average total score across all respondents. Useful for understanding typical response patterns.",
    scale_variance: "How much total scores vary across respondents. Higher variance can lead to higher alpha estimates.",
    reverse_coding: "Flipping the scores of negatively-worded items so all items are scored in the same direction. Essential for accurate reliability calculation.",
    unidimensionality: "The assumption that all items measure a single underlying construct. Violated if items tap into multiple factors.",
    tau_equivalence: "The assumption that all items have equal true score variance. Alpha underestimates reliability if violated.",
    split_half_reliability: "An alternative reliability method that divides items into two halves and correlates them. Less commonly used than alpha.",
    test_retest_reliability: "Reliability assessed by administering the same test twice over time. Measures stability rather than internal consistency."
};

interface ReliabilityResults {
    alpha: number;
    n_items: number;
    n_cases: number;
    confidence_interval: [number, number];
    sem: number;
    item_statistics: {
        means: { [key: string]: number };
        stds: { [key: string]: number };
        corrected_item_total_correlations: { [key: string]: number };
        alpha_if_deleted: { [key: string]: number };
    };
    scale_statistics: {
        mean: number;
        std: number;
        variance: number;
        avg_inter_item_correlation: number;
    };
    interpretation?: string;
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

const getAlphaLevel = (alpha: number) => {
    if (alpha >= 0.9) return { label: 'Excellent', color: 'text-foreground' };
    if (alpha >= 0.8) return { label: 'Good', color: 'text-foreground' };
    if (alpha >= 0.7) return { label: 'Acceptable', color: 'text-foreground' };
    if (alpha >= 0.6) return { label: 'Questionable', color: 'text-amber-600' };
    if (alpha >= 0.5) return { label: 'Poor', color: 'text-rose-600' };
    return { label: 'Unacceptable', color: 'text-rose-600' };
};

const StatisticalSummaryCards = ({ results }: { results: ReliabilityResults }) => {
    const alphaLevel = getAlphaLevel(results.alpha);
    const problematicItems = Object.entries(results.item_statistics.alpha_if_deleted)
        .filter(([_, aid]) => aid > results.alpha).length;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Cronbach&apos;s Alpha</p>
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.alpha.toFixed(3)}</p>
                        <Badge className={results.alpha >= 0.7 ? '' : 'bg-destructive'}>
                            {alphaLevel.label}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Avg Inter-Item r</p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.scale_statistics.avg_inter_item_correlation.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.scale_statistics.avg_inter_item_correlation > 0.3 ? 'Good coherence' : 'Low coherence'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Scale Items</p>
                            <Hash className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.n_items} / {results.n_cases}</p>
                        <p className="text-xs text-muted-foreground">Items / Cases</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Items to Review</p>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${problematicItems > 0 ? 'text-amber-600' : ''}`}>
                            {problematicItems}
                        </p>
                        <p className="text-xs text-muted-foreground">Would improve α if removed</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const parseInterpretation = (interpretation: string) => {
    const sections: { title: string; content: string[]; icon: any }[] = [];
    if (!interpretation) return sections;
    
    const lines = interpretation.split('\n').filter(l => l.trim());
    let currentSection: typeof sections[0] | null = null;

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            const originalTitle = trimmed.replace(/\*\*/g, '').trim();
            let title = originalTitle;
            let icon = BookOpen;
            
            if (originalTitle.toLowerCase().includes('overall')) {
                title = 'Overall Analysis';
                icon = BookOpen;
            } else if (originalTitle.toLowerCase().includes('insight') || originalTitle.toLowerCase().includes('statistical')) {
                title = 'Key Insights';
                icon = Lightbulb;
            } else if (originalTitle.toLowerCase().includes('recommend')) {
                title = 'Recommendations';
                icon = Target;
            }
            
            currentSection = { title, content: [], icon };
            sections.push(currentSection);
        } else if (currentSection && trimmed) {
            currentSection.content.push(trimmed);
        }
    });

    return sections;
};


const ReliabilityGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Reliability Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Reliability */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                What is Reliability Analysis?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Reliability analysis measures the <strong>internal consistency</strong> of a scale — 
                how well a set of items (questions) measure the same underlying construct.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The Core Question:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    "Do all my survey questions measure the same thing?"
                    <br/><br/>
                    If people who score high on one question also score high on others, 
                    your scale has good internal consistency (high reliability).
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Cronbach's Alpha */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Understanding Cronbach&apos;s Alpha
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-foreground mb-3">
                  <strong>Formula concept:</strong> Alpha measures how much items correlate 
                  with each other relative to their total variance.
                </p>
                <p className="text-xs text-muted-foreground">
                  • Ranges from 0 to 1 (can be negative if items are negatively correlated)
                  <br/>• Higher values = better internal consistency
                  <br/>• Represents the proportion of variance in total scores due to true variance
                </p>
              </div>
              
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5 text-center">
                  <p className="font-bold text-primary">≥ 0.9</p>
                  <p className="text-xs text-muted-foreground">Excellent</p>
                </div>
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-center">
                  <p className="font-bold text-primary">0.8 - 0.9</p>
                  <p className="text-xs text-muted-foreground">Good</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10 text-center">
                  <p className="font-bold">0.7 - 0.8</p>
                  <p className="text-xs text-muted-foreground">Acceptable</p>
                </div>
                <div className="p-3 rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 text-center">
                  <p className="font-bold text-amber-600">0.6 - 0.7</p>
                  <p className="text-xs text-muted-foreground">Questionable</p>
                </div>
                <div className="p-3 rounded-lg border border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 text-center">
                  <p className="font-bold text-rose-600">0.5 - 0.6</p>
                  <p className="text-xs text-muted-foreground">Poor</p>
                </div>
                <div className="p-3 rounded-lg border border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 text-center">
                  <p className="font-bold text-rose-600">&lt; 0.5</p>
                  <p className="text-xs text-muted-foreground">Unacceptable</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Metrics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Key Metrics Explained
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Corrected Item-Total Correlation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    How strongly each item correlates with the total score (excluding itself).
                    <br/>• <strong>≥ 0.3:</strong> Good item — contributes to the scale
                    <br/>• <strong>&lt; 0.3:</strong> Weak item — consider removing or revising
                    <br/>• <strong>Negative:</strong> Item may need reverse coding
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Alpha if Item Deleted</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    What alpha would be if this item were removed.
                    <br/>• <strong>Higher than current α:</strong> Removing improves reliability
                    <br/>• <strong>Lower than current α:</strong> Item contributes positively
                    <br/>• Use this to identify problematic items
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Average Inter-Item Correlation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average correlation between all pairs of items.
                    <br/>• <strong>0.2 - 0.4:</strong> Ideal range (items related but not redundant)
                    <br/>• <strong>&lt; 0.2:</strong> Items may be too diverse
                    <br/>• <strong>&gt; 0.4:</strong> Items may be too similar (redundant)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Standard Error of Measurement (SEM)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estimates measurement error in individual scores.
                    <br/>• <strong>Lower is better:</strong> More precise measurement
                    <br/>• Use for confidence bands around individual scores
                    <br/>• SEM = SD × √(1 - α)
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Requirements */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Requirements & Assumptions
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Data Requirements</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Minimum <strong>2 items</strong>, ideally 3-10 per construct</li>
                    <li>• Sample size: <strong>n ≥ 30</strong>, ideally 100+</li>
                    <li>• Subject-to-item ratio: <strong>≥ 5:1</strong>, ideally 10:1</li>
                    <li>• Items measured on same scale (e.g., all Likert)</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Assumptions</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Items measure the <strong>same construct</strong></li>
                    <li>• <strong>Unidimensionality</strong> (one underlying factor)</li>
                    <li>• Items are <strong>tau-equivalent</strong> (equal true scores)</li>
                    <li>• Errors are <strong>uncorrelated</strong></li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Reverse Coding */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Reverse Coding
              </h3>
              <div className="p-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                  <strong>What is reverse coding?</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Some items are phrased in the <strong>opposite direction</strong> of others.
                  <br/><br/>
                  <strong>Example:</strong>
                  <br/>• "I feel happy" (positive)
                  <br/>• "I feel sad" (negative — needs reverse coding)
                  <br/><br/>
                  If not reversed, these will correlate negatively and 
                  <strong> artificially lower</strong> your alpha.
                </p>
                <div className="mt-3 p-2 rounded bg-background border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-muted-foreground">
                    <strong>How to identify:</strong> Look for items with negative item-total correlations 
                    or items that would increase alpha if deleted significantly.
                  </p>
                </div>
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
                  <p className="font-medium text-sm text-rose-700 dark:text-rose-400">Low Alpha (&lt; 0.7)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Causes:</strong> Too few items, items measure different things, 
                    un-reversed negatively worded items
                    <br/><strong>Solutions:</strong> Add more items, remove weak items, 
                    check for needed reverse coding, reconsider construct definition
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Very High Alpha (&gt; 0.95)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Causes:</strong> Items may be redundant (too similar), 
                    or too many items
                    <br/><strong>Solutions:</strong> Consider removing redundant items 
                    for a shorter, equally reliable scale
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Negative Item-Total Correlation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Cause:</strong> Item is negatively worded and needs reverse coding
                    <br/><strong>Solution:</strong> Apply reverse coding to the item, 
                    or remove if it doesn't fit the construct
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
                    <li>• Check item-total correlations first</li>
                    <li>• Reverse code negatively worded items</li>
                    <li>• Report alpha with 95% confidence interval</li>
                    <li>• Examine "alpha if deleted" for each item</li>
                    <li>• Consider content validity, not just alpha</li>
                    <li>• Use factor analysis to check unidimensionality</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Don&apos;t</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Remove items just to inflate alpha</li>
                    <li>• Use alpha for multidimensional scales</li>
                    <li>• Compare alphas across different samples</li>
                    <li>• Assume high alpha = valid measurement</li>
                    <li>• Ignore theoretical considerations</li>
                    <li>• Report alpha without sample size</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Cronbach&apos;s alpha coefficient</li>
                    <li>• 95% confidence interval</li>
                    <li>• Number of items</li>
                    <li>• Sample size</li>
                    <li>• Item-total correlation range</li>
                    <li>• Any items removed and why</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Alternatives</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>McDonald&apos;s ω:</strong> Better for non-tau-equivalent items</li>
                    <li>• <strong>Split-half:</strong> Simpler, but depends on split</li>
                    <li>• <strong>Test-retest:</strong> Measures stability over time</li>
                    <li>• <strong>Inter-rater:</strong> For observer-rated measures</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                When to Use Reliability Analysis
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Good Use Cases</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Validating survey questionnaires</li>
                    <li>• Developing psychological scales</li>
                    <li>• Creating educational assessments</li>
                    <li>• Quality control for existing scales</li>
                    <li>• Comparing scale versions</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-1">Not Appropriate For</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Single-item measures</li>
                    <li>• Formative indicators (components cause construct)</li>
                    <li>• Multidimensional scales (use per subscale)</li>
                    <li>• Dichotomous items (use KR-20 instead)</li>
                    <li>• Time-varying constructs (use test-retest)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Cronbach&apos;s alpha measures 
                internal consistency, not validity. High reliability doesn&apos;t mean your scale 
                measures what you intend — that requires validity evidence. Always consider 
                both reliability AND validity when evaluating measurement quality. For multidimensional 
                constructs, compute alpha separately for each subscale.
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
                        Reliability Analysis Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of terms used in reliability and internal consistency analysis
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


const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const reliabilityExample = exampleDatasets.find(d => d.id === 'well-being-survey');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <ShieldCheck className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Reliability Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Measure the internal consistency of your scales and questionnaires
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Gauge className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Internal Consistency</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Assess how well scale items measure the same construct
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Item Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify problematic items that reduce reliability
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Scale Improvement</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Optimize your measurement instrument quality
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileSearch className="w-5 h-5" />
                            When to Use This Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use Cronbach&apos;s Alpha when you have multiple questions or items intended to measure a single 
                            underlying concept. Essential for validating surveys, psychological scales, and educational assessments.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Items:</strong> At least 2, ideally 3-10 per construct</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> Minimum 30, ideally 100+</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Scale type:</strong> Continuous or ordinal (Likert)</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-primary" />
                                    Interpreting Alpha
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>≥ 0.9:</strong> Excellent reliability</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>≥ 0.7:</strong> Acceptable for research</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>&lt; 0.7:</strong> Questionable to poor</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {reliabilityExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(reliabilityExample)} size="lg">
                                <ShieldCheck className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface ReliabilityPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    restoredState?: any;
}

export default function ReliabilityPage({ data, numericHeaders, onLoadExample, restoredState }: ReliabilityPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [reverseCodeItems, setReverseCodeItems] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<ReliabilityResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showGuide, setShowGuide] = useState(false); 
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);  // 👈 추가

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    useEffect(() => {
        if (numericHeaders.length > 0) {
            setSelectedItems(numericHeaders);
        }
    }, [numericHeaders]);

    useEffect(() => {
        if (restoredState) {
            setSelectedItems(restoredState.params.selectedItems || []);
            setReverseCodeItems(restoredState.params.reverseCodeItems || []);
            setAnalysisResult(restoredState.results);
            setView('main');
            setCurrentStep(4);
            setMaxReachedStep(6);
        } else {
            setView(canRun ? 'main' : 'intro');
            setAnalysisResult(null);
        }
    }, [restoredState, canRun]);

    useEffect(() => {
        if (!restoredState) {
            setView(canRun ? 'main' : 'intro');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, canRun]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({
            label: 'Minimum items selected',
            passed: selectedItems.length >= 2,
            detail: selectedItems.length >= 2 
                ? `${selectedItems.length} items selected` 
                : `Only ${selectedItems.length} item(s) selected (minimum: 2)`
        });

        checks.push({
            label: 'Sufficient sample size',
            passed: data.length >= 30,
            detail: `n = ${data.length} observations (${data.length >= 100 ? 'Good' : data.length >= 30 ? 'Adequate' : 'Very small - unstable estimates'})`
        });

        if (selectedItems.length >= 2) {
            const ratio = data.length / selectedItems.length;
            checks.push({
                label: 'Subject-to-item ratio',
                passed: ratio >= 5,
                detail: `${ratio.toFixed(1)}:1 ratio (${ratio >= 10 ? 'Good' : ratio >= 5 ? 'Adequate' : 'Low - unstable estimates'})`
            });
        }

        const missingCount = selectedItems.reduce((count: number, varName: string) => {
            return count + data.filter((row: any) => row[varName] == null || row[varName] === '').length;
        }, 0);
        
        checks.push({
            label: 'Missing values check',
            passed: missingCount === 0,
            detail: missingCount === 0 
                ? 'No missing values detected' 
                : `${missingCount} missing values will be handled with listwise deletion`
        });

        return checks;
    }, [data, selectedItems]);

    const allValidationsPassed = dataValidation.filter(c => c.label === 'Minimum items selected').every(check => check.passed);

    const goToStep = (step: Step) => {
        setCurrentStep(step);
        if (step > maxReachedStep) setMaxReachedStep(step);
    };

    const nextStep = () => {
        if (currentStep === 3) {
            handleAnalysis();
        } else if (currentStep < 6) {
            goToStep((currentStep + 1) as Step);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) goToStep((currentStep - 1) as Step);
    };

    const handleItemSelectionChange = (header: string, checked: boolean) => {
        setSelectedItems(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleReverseCodeSelectionChange = (header: string, checked: boolean) => {
        setReverseCodeItems(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) {
            toast({ variant: 'destructive', title: 'No results to download' });
            return;
        }
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `Reliability_Analysis_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = image;
            link.click();
            toast({ title: "Download complete" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Download failed" });
        } finally {
            setIsDownloading(false);
        }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        
        const summaryData = [{
            cronbachs_alpha: analysisResult.alpha,
            n_items: analysisResult.n_items,
            n_cases: analysisResult.n_cases,
            ci_lower: analysisResult.confidence_interval[0],
            ci_upper: analysisResult.confidence_interval[1],
            sem: analysisResult.sem,
            scale_mean: analysisResult.scale_statistics.mean,
            scale_std: analysisResult.scale_statistics.std,
            avg_inter_item_correlation: analysisResult.scale_statistics.avg_inter_item_correlation
        }];
        
        const itemStats: any[] = [];
        Object.keys(analysisResult.item_statistics.means).forEach(item => {
            itemStats.push({
                item,
                mean: analysisResult.item_statistics.means[item],
                std: analysisResult.item_statistics.stds[item],
                corrected_item_total_correlation: analysisResult.item_statistics.corrected_item_total_correlations[item],
                alpha_if_deleted: analysisResult.item_statistics.alpha_if_deleted[item]
            });
        });
        
        let csvContent = "RELIABILITY ANALYSIS SUMMARY\n" + Papa.unparse(summaryData) + "\n\n";
        csvContent += "ITEM STATISTICS\n" + Papa.unparse(itemStats) + "\n";
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Reliability_Analysis_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    // handleDownloadDOCX 함수 추가
const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/reliability-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                results: analysisResult,
                selectedItems,
                sampleSize: data.length
            })
        });
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Reliability_Analysis_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, selectedItems, data.length, toast]);


    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 2) {
            toast({ variant: 'destructive', title: 'Please select at least 2 items.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/reliability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    items: selectedItems,
                    reverseCodeItems
                })
            });

            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                let errorMsg = `HTTP error! status: ${response.status}`;
                if (typeof errorResult.detail === 'string') {
                    errorMsg = errorResult.detail;
                } else if (Array.isArray(errorResult.detail)) {
                    errorMsg = errorResult.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
                } else if (errorResult.error) {
                    errorMsg = typeof errorResult.error === 'string' ? errorResult.error : JSON.stringify(errorResult.error);
                }
                throw new Error(errorMsg);
            }

            const result: ReliabilityResults = await response.json();
            if ((result as any).error) {
                const errMsg = typeof (result as any).error === 'string' ? (result as any).error : JSON.stringify((result as any).error);
                throw new Error(errMsg);
            }
            
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'Analysis Complete', description: "Cronbach's Alpha has been calculated." });
        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, reverseCodeItems, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult;
    const interpretationSections = results?.interpretation ? parseInterpretation(results.interpretation) : [];

    const ProgressBar = () => (
        <div className="mb-8">
            <div className="flex items-center justify-between w-full gap-2">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!results);
                    const isCurrent = currentStep === step.id;
                    const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!results);
                    return (
                        <button
                            key={step.id}
                            onClick={() => isAccessible && goToStep(step.id)}
                            disabled={!isAccessible}
                            className={`flex flex-col items-center gap-2 transition-all flex-1 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                        >
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
            {/* 👇 Guide 컴포넌트 추가 */}
            <ReliabilityGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />


            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Reliability Analysis</h1>
                    <p className="text-muted-foreground mt-1">Measure internal consistency with Cronbach&apos;s Alpha</p>
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
                {/* Step 1: Select Items */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Select Scale Items</CardTitle>
                                    <CardDescription>Choose items that measure the same construct</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Scale Items</Label>
                                <ScrollArea className="h-48 border rounded-xl p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {numericHeaders.map(header => (
                                            <div key={header} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`item-${header}`}
                                                    checked={selectedItems.includes(header)}
                                                    onCheckedChange={(checked) => handleItemSelectionChange(header, !!checked)}
                                                />
                                                <label htmlFor={`item-${header}`} className="text-sm cursor-pointer">{header}</label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <p className="text-xs text-muted-foreground">{selectedItems.length} items selected</p>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                    Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations
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
                                    <CardDescription>Configure reverse-coded items (if any)</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Reverse-Code Items (Optional)</Label>
                                <p className="text-xs text-muted-foreground">Select negatively worded items to reverse their scores before analysis.</p>
                                <ScrollArea className="h-40 border rounded-xl p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {selectedItems.map(item => (
                                            <div key={`rev-${item}`} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`rev-${item}`}
                                                    checked={reverseCodeItems.includes(item)}
                                                    onCheckedChange={(checked) => handleReverseCodeSelectionChange(item, !!checked)}
                                                />
                                                <label htmlFor={`rev-${item}`} className="text-sm cursor-pointer">{item}</label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <p className="text-xs text-muted-foreground">{reverseCodeItems.length} items will be reverse-coded</p>
                            </div>

                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Analysis Summary</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Items:</strong> {selectedItems.length} selected</p>
                                    <p>• <strong className="text-foreground">Sample:</strong> {data.length} observations</p>
                                    <p>• <strong className="text-foreground">Method:</strong> Cronbach&apos;s Alpha</p>
                                    <p>• <strong className="text-foreground">Reverse-coded:</strong> {reverseCodeItems.length > 0 ? reverseCodeItems.join(', ') : 'None'}</p>
                                </div>
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
                                    <CardDescription>Checking if your data is ready for analysis</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}
                                    >
                                        {check.passed ? (
                                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>
                                                {check.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                    Cronbach&apos;s Alpha will measure how consistently your items measure the same construct.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</>
                                ) : (
                                    <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && (() => {
                    const alpha = results.alpha;
                    const isAcceptable = alpha >= 0.7;
                    const problematicItems = Object.entries(results.item_statistics.alpha_if_deleted)
                        .filter(([_, aid]) => aid > alpha);
                    const consistencyPercent = (alpha * 100).toFixed(0);

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Result Summary</CardTitle>
                                        <CardDescription>Key findings from your survey/scale analysis</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isAcceptable ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Sparkles className={`w-5 h-5 ${isAcceptable ? 'text-primary' : 'text-rose-600'}`} />
                                        Key Findings
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isAcceptable ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                            <p className="text-sm">
                                                Your survey questions are <strong>{consistencyPercent}% consistent</strong> with each other — {isAcceptable ? 'they work well as a set.' : 'they may need revision.'}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isAcceptable ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                            <p className="text-sm">
                                                {isAcceptable 
                                                    ? "Respondents who score high on one question tend to score high on others — your scale is coherent." 
                                                    : "Responses are inconsistent across questions — people may be interpreting them differently."}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isAcceptable ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                            <p className="text-sm">
                                                {problematicItems.length === 0 
                                                    ? "All questions contribute to measuring the same thing." 
                                                    : `${problematicItems.length} question(s) don't fit well with the others and could be removed.`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isAcceptable ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isAcceptable ? (
                                            <CheckCircle2 className="w-6 h-6 text-primary" />
                                        ) : (
                                            <AlertTriangle className="w-6 h-6 text-rose-600" />
                                        )}
                                        <div>
                                            <p className="font-semibold">
                                                {alpha >= 0.9 ? "Ready to Use — Excellent Quality" : alpha >= 0.8 ? "Ready to Use — Good Quality" : alpha >= 0.7 ? "Usable — Acceptable Quality" : alpha >= 0.6 ? "Needs Improvement" : "Needs Major Revision"}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {alpha >= 0.9 ? "Your survey is highly consistent. You can confidently use the total score." 
                                                    : alpha >= 0.8 ? "Your survey works well. The total score is reliable." 
                                                    : alpha >= 0.7 ? "Your survey meets basic standards. Consider reviewing weak questions for future versions." 
                                                    : alpha >= 0.6 ? "Some questions don't fit well. Review and revise before using for important decisions." 
                                                    : "The questions aren't measuring the same thing. Major revision needed before use."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Evidence Section */}
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-slate-600" />
                                        Evidence Summary
                                    </h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>• <strong>Cronbach's α:</strong> {alpha.toFixed(3)} — internal consistency measure. {alpha >= 0.9 ? '≥0.9 is excellent.' : alpha >= 0.8 ? '0.8-0.9 is good.' : alpha >= 0.7 ? '0.7-0.8 is acceptable.' : alpha >= 0.6 ? '0.6-0.7 needs improvement.' : '<0.6 is unreliable.'}</p>
                                        <p>• <strong>Avg Inter-Item Correlation:</strong> {results.scale_statistics.avg_inter_item_correlation.toFixed(3)} — measures how items relate to each other. {results.scale_statistics.avg_inter_item_correlation >= 0.3 ? '≥0.3 indicates good coherence.' : '<0.3 indicates weak connections.'}</p>
                                        <p>• <strong>95% CI:</strong> [{results.confidence_interval[0].toFixed(3)}, {results.confidence_interval[1].toFixed(3)}] — true α likely falls in this range.</p>
                                        <p>• <strong>SEM:</strong> {results.sem.toFixed(3)} — measurement uncertainty. Lower values indicate more precise measurement.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Consistency</p>
                                                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{consistencyPercent}%</p>
                                                <p className="text-xs text-muted-foreground">{isAcceptable ? 'Good' : 'Needs work'}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Question Fit</p>
                                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{results.scale_statistics.avg_inter_item_correlation > 0.3 ? 'Good' : 'Low'}</p>
                                                <p className="text-xs text-muted-foreground">How well items relate</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Questions</p>
                                                    <Hash className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-2xl font-semibold">{results.n_items}</p>
                                                <p className="text-xs text-muted-foreground">{results.n_cases} responses</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-muted-foreground">Problem Items</p>
                                                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className={`text-2xl font-semibold ${problematicItems.length > 0 ? 'text-amber-600' : ''}`}>
                                                    {problematicItems.length}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Consider removing</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Quality Rating:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = alpha >= 0.9 ? 5 : alpha >= 0.8 ? 4 : alpha >= 0.7 ? 3 : alpha >= 0.6 ? 2 : 1;
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
                    );
                })()}

                {/* Step 5: Reasoning - Business Friendly */}
                {currentStep === 5 && results && (() => {
                    const alpha = results.alpha;
                    const isAcceptable = alpha >= 0.7;
                    const consistencyPercent = (alpha * 100).toFixed(0);
                    const avgCorr = results.scale_statistics.avg_inter_item_correlation;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Lightbulb className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Why This Conclusion?</CardTitle>
                                        <CardDescription>Simple explanation of how we reached this result</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">What We Checked</h4>
                                            <p className="text-sm text-muted-foreground">
                                                We looked at your <strong className="text-foreground">{results.n_items} questions</strong> to see if they all measure the same thing. 
                                                Think of it like checking if all thermometers in a room give similar readings.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">How Consistent Are the Responses?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Your questions show <strong className="text-foreground">{consistencyPercent}% consistency</strong>. 
                                                {isAcceptable 
                                                    ? " When someone scores high on one question, they tend to score similarly on others — that's good!" 
                                                    : " Responses vary a lot between questions — people may be interpreting them differently."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Do Questions Fit Together?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                The average connection between questions is <strong className="text-foreground">{avgCorr >= 0.3 ? 'strong' : 'weak'}</strong>.{' '}
                                                {avgCorr >= 0.3 
                                                    ? "Questions relate well to each other, forming a coherent set." 
                                                    : "Some questions may be measuring different things than the others."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">What This Means for You</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {isAcceptable 
                                                    ? "You can combine answers into a single score (like a total or average) and trust it represents one underlying concept." 
                                                    : "Using a single combined score may be misleading. Consider revising questions or splitting into separate scales."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isAcceptable ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        {isAcceptable ? (
                                            <><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line: Your Survey Works</>
                                        ) : (
                                            <><AlertTriangle className="w-5 h-5 text-rose-600" /> Bottom Line: Needs Improvement</>
                                        )}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {isAcceptable 
                                            ? "Your questions work together to measure one thing. The total score is meaningful and you can use it for decisions." 
                                            : "Your questions aren't measuring the same concept consistently. Review the weak questions before using this survey for important decisions."}
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4" />Quality Reference
                                    </h4>
                                    <div className="grid grid-cols-5 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">90%+</p>
                                            <p className="text-muted-foreground">Excellent</p>
                                        </div>
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">80%+</p>
                                            <p className="text-muted-foreground">Good</p>
                                        </div>
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">70%+</p>
                                            <p className="text-muted-foreground">Acceptable</p>
                                        </div>
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">60%+</p>
                                            <p className="text-muted-foreground">Weak</p>
                                        </div>
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">&lt;60%</p>
                                            <p className="text-muted-foreground">Poor</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between">
                                <Button variant="ghost" onClick={prevStep}>
                                    <ChevronLeft className="mr-2 w-4 h-4" />Back
                                </Button>
                                <Button onClick={nextStep} size="lg">
                                    View Full Statistics<ChevronRight className="ml-2 w-4 h-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && results && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-semibold">Statistical Details</h2>
                                <p className="text-sm text-muted-foreground">Full technical report</p>
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
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                        PNG Image
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadDOCX}>
                                        <FileType className="mr-2 h-4 w-4" />
                                        Word Document
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-muted-foreground">
                                        <FileText className="mr-2 h-4 w-4" />PDF Report<Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled className="text-muted-foreground">
                                        <FileCode className="mr-2 h-4 w-4" />Python Script<Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b">
                                <h2 className="text-2xl font-bold">Reliability Analysis Report</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Items: {results.n_items} | Cases: {results.n_cases} | Generated: {new Date().toLocaleDateString()}
                                </p>
                            </div>

                            <StatisticalSummaryCards results={results} />

                            {interpretationSections.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Detailed Analysis</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {interpretationSections.map((section, idx) => {
                                            const IconComponent = section.icon;
                                            let gradientClass = 'bg-gradient-to-br from-primary/5 to-primary/10';
                                            let borderClass = 'border-primary/40';
                                            let iconColorClass = 'text-primary';
                                            
                                            if (section.title === 'Key Insights') {
                                                gradientClass = 'bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10';
                                                borderClass = 'border-blue-300 dark:border-blue-700';
                                                iconColorClass = 'text-blue-600 dark:text-blue-400';
                                            } else if (section.title === 'Recommendations') {
                                                gradientClass = 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10';
                                                borderClass = 'border-amber-300 dark:border-amber-700';
                                                iconColorClass = 'text-amber-600 dark:text-amber-400';
                                            }

                                            return (
                                                <div key={idx} className={`rounded-lg p-6 border ${gradientClass} ${borderClass}`}>
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <IconComponent className={`h-4 w-4 ${iconColorClass}`} />
                                                        <h3 className="font-semibold">{section.title}</h3>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {section.content.map((line, lineIdx) => (
                                                            <p key={lineIdx} className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            )}

                            {results.plot && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Visualization</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Image src={results.plot} alt="Reliability Analysis Plots" width={1400} height={1200} className="w-full rounded-md border" />
                                    </CardContent>
                                </Card>
                            )}

                            <div className="grid gap-4 lg:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Scale Statistics</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Statistic</TableHead>
                                                    <TableHead className="text-right">Value</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell className="font-medium">Cronbach&apos;s Alpha</TableCell>
                                                    <TableCell className="text-right font-mono">{results.alpha.toFixed(4)}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium">95% CI</TableCell>
                                                    <TableCell className="text-right font-mono">[{results.confidence_interval[0].toFixed(3)}, {results.confidence_interval[1].toFixed(3)}]</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium">Scale Mean</TableCell>
                                                    <TableCell className="text-right font-mono">{results.scale_statistics.mean.toFixed(4)}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium">Scale Std Dev</TableCell>
                                                    <TableCell className="text-right font-mono">{results.scale_statistics.std.toFixed(4)}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium">Scale Variance</TableCell>
                                                    <TableCell className="text-right font-mono">{results.scale_statistics.variance.toFixed(4)}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium">Avg Inter-Item Correlation</TableCell>
                                                    <TableCell className="text-right font-mono">{results.scale_statistics.avg_inter_item_correlation.toFixed(4)}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium">Standard Error of Measurement</TableCell>
                                                    <TableCell className="text-right font-mono">{results.sem.toFixed(4)}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Item-Total Statistics</CardTitle>
                                        <CardDescription>How each item relates to the overall scale</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[300px]">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Item</TableHead>
                                                        <TableHead className="text-right">Item-Total r</TableHead>
                                                        <TableHead className="text-right">α if Deleted</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {Object.keys(results.item_statistics.means).map((item) => {
                                                        const citc = results.item_statistics.corrected_item_total_correlations[item];
                                                        const aid = results.item_statistics.alpha_if_deleted[item];
                                                        return (
                                                            <TableRow key={item}>
                                                                <TableCell className="font-medium">{item}</TableCell>
                                                                <TableCell className={`text-right font-mono ${citc < 0.3 ? 'text-rose-600' : ''}`}>
                                                                    {citc.toFixed(3)}
                                                                </TableCell>
                                                                <TableCell className={`text-right font-mono ${aid > results.alpha ? 'text-green-600' : ''}`}>
                                                                    {aid.toFixed(3)}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Item Descriptive Statistics</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item</TableHead>
                                                <TableHead className="text-right">Mean</TableHead>
                                                <TableHead className="text-right">Std Dev</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.keys(results.item_statistics.means).map((item) => (
                                                <TableRow key={item}>
                                                    <TableCell className="font-medium">{item}</TableCell>
                                                    <TableCell className="text-right font-mono">{results.item_statistics.means[item].toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{results.item_statistics.stds[item].toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="mt-4 flex justify-start">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
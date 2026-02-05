'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Network, CheckCircle, HelpCircle, Download, Settings, FileSearch, TrendingUp, BookOpen, GitBranch, Zap, Activity, Percent, Target, FileSpreadsheet, ImageIcon, Lightbulb, Database, Settings2, Shield, FileText, BarChart3, ChevronRight, ChevronLeft, Sparkles, Check, ArrowRight, ChevronDown, FileCode, FileType, AlertTriangle, CheckCircle2, Info, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import Papa from 'papaparse';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/moderation_analysis.py?alt=media";

// Statistical terms glossary for Moderation Analysis
const moderationTermDefinitions: Record<string, string> = {
    "Moderation Analysis": "A statistical method to test whether a third variable (M) changes the relationship between an independent variable (X) and dependent variable (Y). Answers 'when' or 'for whom' questions.",
    "Moderator (M)": "A variable that affects the direction and/or strength of the relationship between X and Y. The moderator specifies when or for whom the X-Y relationship holds.",
    "Interaction Effect": "The combined effect of X and M on Y that is beyond their separate individual effects. Significant interaction means the X-Y relationship depends on M levels.",
    "Independent Variable (X)": "The predictor or focal variable whose effect on Y is being examined. The X-Y relationship may vary depending on M.",
    "Dependent Variable (Y)": "The outcome variable that is predicted by X, M, and their interaction (X×M).",
    "Simple Slopes": "The regression slopes of Y on X at specific levels of the moderator (typically at -1SD, Mean, and +1SD). Used to probe significant interactions.",
    "ΔR² (R-squared Change)": "The additional variance in Y explained by adding the interaction term to the model. Indicates the practical importance of the moderation effect.",
    "F-Change": "The F-statistic testing whether the ΔR² is significantly different from zero. Determines if the interaction significantly improves the model.",
    "Hierarchical Regression": "A regression method where predictors are entered in steps. Step 1 includes main effects (X, M); Step 2 adds the interaction (X×M).",
    "Mean Centering": "Subtracting the mean from X and M before creating the interaction term. Reduces multicollinearity and aids interpretation of main effects.",
    "Main Effect": "The direct effect of X or M on Y, ignoring their interaction. In moderation, main effects are typically interpreted only when interaction is non-significant.",
    "Conditional Effect": "The effect of X on Y at a specific level of M. Simple slopes are conditional effects at low, medium, and high M.",
    "Interaction Term (X×M)": "The product of X and M (after centering) included in the regression to test moderation. A significant coefficient indicates moderation exists.",
    "Johnson-Neyman Technique": "A method to identify the exact values of M at which the X-Y relationship becomes significant or non-significant.",
    "Probing Interactions": "Follow-up analyses after finding a significant interaction to understand its nature. Includes simple slopes and visualization.",
    "Pick-a-Point Approach": "Testing simple slopes at specific, meaningful values of the moderator (often -1SD, Mean, +1SD).",
    "Regions of Significance": "Ranges of moderator values where the X-Y relationship is statistically significant vs. non-significant.",
    "Cross-over Interaction": "When the direction of the X-Y relationship reverses at different levels of M (e.g., positive at low M, negative at high M).",
    "Buffering Effect": "When higher M weakens or eliminates the X-Y relationship. M 'protects' Y from the influence of X.",
    "Enhancing Effect": "When higher M strengthens the X-Y relationship. M amplifies the effect of X on Y.",
    "Statistical Power": "The probability of detecting a true moderation effect. Interaction tests typically require larger samples (N > 100) for adequate power.",
    "Effect Size Guidelines": "For ΔR²: Small ≈ .02, Medium ≈ .05-.09, Large ≥ .10. These help interpret the practical significance of moderation.",
    "Multicollinearity": "High correlation between predictors that can inflate standard errors. Centering X and M reduces multicollinearity with the interaction term."
};

interface PathResult {
    coefficients: number[];
    p_values: number[];
}

interface SimpleSlope {
    label: string;
    slope: number;
    p_value: number;
}

interface ModerationResults {
    step1: PathResult;
    step2: PathResult;
    r_squared_change: { delta_r2: number; f_change: number; p_change: number };
    simple_slopes: SimpleSlope[];
    interpretation: string;
}

interface FullAnalysisResponse {
    results: ModerationResults;
    plot: string;
    interpretations?: {
        overall_analysis: string;
        interaction_insights: string[];
        recommendations: string;
    };
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: 1, label: 'Data', icon: Database },
    { id: 2, label: 'Settings', icon: Settings2 },
    { id: 3, label: 'Validation', icon: Shield },
    { id: 4, label: 'Summary', icon: FileText },
    { id: 5, label: 'Reasoning', icon: Lightbulb },
    { id: 6, label: 'Statistics', icon: BarChart3 },
];

const StatisticalSummaryCards = ({ results }: { results: ModerationResults }) => {
    const deltaR2 = results.r_squared_change.delta_r2;
    const isSignificant = results.r_squared_change.p_change < 0.05;
    const significantSlopes = results.simple_slopes.filter(s => s.p_value < 0.05).length;
    const fChange = results.r_squared_change.f_change;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Interaction</p>
                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${isSignificant ? 'text-green-600' : 'text-gray-600'}`}>
                            {isSignificant ? 'Significant' : 'Not Sig.'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            p = {results.r_squared_change.p_change.toFixed(3)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">ΔR²</p>
                            <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{(deltaR2 * 100).toFixed(2)}%</p>
                        <p className="text-xs text-muted-foreground">Added by interaction</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">F-Change</p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{fChange.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Model improvement</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Sig. Slopes</p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{significantSlopes}/{results.simple_slopes.length}</p>
                        <p className="text-xs text-muted-foreground">At different levels</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Python Code Modal Component
const PythonCodeModal = ({ 
    isOpen, 
    onClose, 
    codeUrl 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    codeUrl: string;
}) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !code) {
            fetchCode();
        }
    }, [isOpen, code]);

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
        link.download = 'moderation_analysis.py';
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
                        Python Code - Moderation Analysis
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

// Glossary Modal Component
const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Moderation Analysis Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in moderation analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(moderationTermDefinitions).map(([term, definition]) => (
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

const generateModerationInterpretations = (results: ModerationResults) => {
    const insights: string[] = [];
    const isSignificant = results.r_squared_change.p_change < 0.05;
    
    let overall = '';
    if (isSignificant) {
        overall = '<strong>Significant moderation effect detected.</strong> The relationship between X and Y varies depending on the level of the moderator M.';
    } else {
        overall = '<strong>No significant moderation effect detected.</strong> The X-Y relationship does not meaningfully vary across different levels of M.';
    }
    
    insights.push(`<strong>R² Change:</strong> The interaction added ${(results.r_squared_change.delta_r2 * 100).toFixed(2)}% to variance explained (ΔR² = ${results.r_squared_change.delta_r2.toFixed(4)}).`);
    insights.push(`<strong>F-Change Test:</strong> F = ${results.r_squared_change.f_change.toFixed(2)}, p ${results.r_squared_change.p_change < 0.001 ? '< .001' : `= ${results.r_squared_change.p_change.toFixed(3)}`}.`);
    
    results.simple_slopes.forEach(slope => {
        insights.push(`<strong>At ${slope.label}:</strong> Slope = ${slope.slope.toFixed(3)}, p ${slope.p_value < 0.001 ? '< .001' : `= ${slope.p_value.toFixed(3)}`} — ${slope.p_value < 0.05 ? 'significant' : 'not significant'}.`);
    });
    
    let recommendations = '';
    if (isSignificant) {
        recommendations = 'Report both the interaction effect and simple slopes. Include the interaction plot in publications. Consider testing for higher-order interactions.';
    } else {
        recommendations = 'Focus on main effects. Check if you have sufficient power (N < 100 may be underpowered). Consider alternative moderators suggested by theory.';
    }
    
    return { overall_analysis: overall, interaction_insights: insights, recommendations };
};



const ModerationGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Moderation Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Moderation */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Network className="w-4 h-4" />
                What is Moderation Analysis?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Moderation analysis tests whether a third variable (M) <strong>changes the strength 
                or direction</strong> of the relationship between X and Y. It answers "when" or 
                "for whom" questions.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The model:</strong><br/>
                  <span className="font-mono text-xs">
                    Y = b₀ + b₁X + b₂M + b₃(X×M) + ε
                  </span><br/>
                  <span className="text-muted-foreground text-xs">
                    The interaction term (X×M) is key: if b₃ is significant, moderation exists.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Moderation vs Mediation */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Moderation vs Mediation
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Moderation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Answers: <strong>WHEN/FOR WHOM</strong></li>
                    <li>• M affects the <strong>strength</strong> of X→Y</li>
                    <li>• Tests interaction effect (X×M)</li>
                    <li>• M is a boundary condition</li>
                    <li>• Example: "Does therapy work better for younger patients?"</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm mb-1">Mediation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Answers: <strong>HOW/WHY</strong></li>
                    <li>• M transmits the effect of X to Y</li>
                    <li>• Tests indirect path (X→M→Y)</li>
                    <li>• M is a mechanism</li>
                    <li>• Example: "Does therapy work through self-efficacy?"</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Testing Moderation */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                How Moderation is Tested
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Hierarchical Regression</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Step 1:</strong> Enter X and M (main effects)<br/>
                    <strong>Step 2:</strong> Add X×M (interaction)<br/>
                    <strong>Key test:</strong> Is the change in R² (ΔR²) significant?
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Mean Centering</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Before creating X×M, subtract the mean from X and M.
                    <br/>• Reduces multicollinearity with interaction term
                    <br/>• Main effects interpreted at the mean of other variable
                    <br/>• Doesn't change the interaction test
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Significant Interaction Means:</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The X→Y relationship <strong>differs</strong> depending on M levels.
                    <br/>• High M: X→Y might be strong
                    <br/>• Low M: X→Y might be weak or reversed
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Understanding Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Understanding Your Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">ΔR² (R-squared Change)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Additional variance explained by adding the interaction.
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">≥.10</p>
                      <p className="text-muted-foreground">Large</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">.05-.09</p>
                      <p className="text-muted-foreground">Medium</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">.02-.04</p>
                      <p className="text-muted-foreground">Small</p>
                    </div>
                    <div className="p-1 rounded bg-background text-center">
                      <p className="font-medium">&lt;.02</p>
                      <p className="text-muted-foreground">Tiny</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">F-Change</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tests whether ΔR² is significantly greater than zero.
                    <br/>• <strong>p &lt; .05:</strong> Interaction is significant = moderation exists
                    <br/>• <strong>p ≥ .05:</strong> Interaction not significant = no moderation
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Interaction Coefficient (b₃)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Positive b₃:</strong> Higher M strengthens the X→Y relationship<br/>
                    <strong>Negative b₃:</strong> Higher M weakens the X→Y relationship
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Simple Slopes */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Simple Slopes Analysis
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  After finding a significant interaction, <strong>probe</strong> it by testing the 
                  X→Y relationship at different levels of M (typically -1SD, Mean, +1SD).
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-background">
                    <strong>At Low M (-1SD):</strong> Is the X→Y slope significant?
                  </div>
                  <div className="p-2 rounded bg-background">
                    <strong>At Mean M:</strong> Is the X→Y slope significant?
                  </div>
                  <div className="p-2 rounded bg-background">
                    <strong>At High M (+1SD):</strong> Is the X→Y slope significant?
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  This reveals <strong>where</strong> the relationship is significant and <strong>how</strong> 
                  it changes across moderator levels.
                </p>
              </div>
            </div>

            <Separator />

            {/* Types of Moderation */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Types of Moderation Patterns
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Enhancing Effect</p>
                  <p className="text-xs text-muted-foreground">
                    High M <strong>strengthens</strong> the X→Y relationship.
                    <br/>Example: "Motivation enhances the effect of practice on performance."
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Buffering Effect</p>
                  <p className="text-xs text-muted-foreground">
                    High M <strong>weakens</strong> or blocks the X→Y relationship.
                    <br/>Example: "Social support buffers the effect of stress on depression."
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Cross-over Interaction</p>
                  <p className="text-xs text-muted-foreground">
                    The direction of X→Y <strong>reverses</strong> at different M levels.
                    <br/>Example: "Positive at low M, negative at high M."
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Ordinal Interaction</p>
                  <p className="text-xs text-muted-foreground">
                    Same direction at all M levels, but <strong>different magnitude</strong>.
                    <br/>Example: "Positive at all levels, but stronger at high M."
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
                    <li>• Have theoretical basis for expecting moderation</li>
                    <li>• Sample size: n ≥ 100 for adequate power</li>
                    <li>• Center X and M to reduce multicollinearity</li>
                    <li>• Check for outliers (can inflate interactions)</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpreting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Always probe significant interactions</li>
                    <li>• Report simple slopes at multiple M levels</li>
                    <li>• Include interaction plot in reports</li>
                    <li>• Consider effect size (ΔR²), not just p-value</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Common Issues</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Low power:</strong> Interactions need large samples</li>
                    <li>• <strong>Multicollinearity:</strong> Center variables</li>
                    <li>• <strong>Range restriction:</strong> Limits detection</li>
                    <li>• <strong>Measurement error:</strong> Attenuates effects</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• ΔR² and F-change for interaction</li>
                    <li>• Unstandardized coefficients (b) for all terms</li>
                    <li>• Simple slopes with SE and significance</li>
                    <li>• Interaction plot showing pattern</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> A significant interaction means 
                the X→Y relationship <strong>depends on M</strong>. Focus on the interaction term 
                (X×M), not the main effects when moderation is present. Always follow up with 
                simple slopes analysis and visualization to understand <strong>how</strong> the 
                relationship changes across moderator levels.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};



const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Network className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Moderation Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Discover when and for whom relationships between variables change
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <GitBranch className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Interaction Effects</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Test if relationships vary by conditions</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Zap className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Simple Slopes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Analyze effects at different moderator levels</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Visual Insights</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">See how relationships change graphically</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileSearch className="w-5 h-5" />
                            When to Use This Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use moderation when you suspect the X-Y relationship depends on a third variable.
                            It answers &quot;when&quot; or &quot;for whom&quot; questions.
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
                                        <span><strong>Variables:</strong> 3 continuous</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample:</strong> Min 50, ideally 100+</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>X×M sig.:</strong> Moderation exists</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>ΔR²:</strong> Variance added</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-2">
                        <Button 
                            onClick={() => {
                                const example = exampleDatasets.find(d => d.id === 'stress-support') || exampleDatasets[0];
                                onLoadExample(example);
                            }} 
                            size="lg"
                        >
                            <Network className="mr-2 h-5 w-5" />
                            Load Example Data
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

interface ModerationPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    restoredState?: any;
}

export default function ModerationPage({ data, numericHeaders, onLoadExample, restoredState }: ModerationPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [xVar, setXVar] = useState<string>('');
    const [mVar, setMVar] = useState<string>('');
    const [yVar, setYVar] = useState<string>('');
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Modal states
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);

    useEffect(() => {
        if (numericHeaders.length >= 3) {
            setXVar(numericHeaders[0]);
            setMVar(numericHeaders[1]);
            setYVar(numericHeaders[2]);
        }
    }, [numericHeaders]);

    useEffect(() => {
        if (restoredState) {
            setXVar(restoredState.params.xVar || '');
            setMVar(restoredState.params.mVar || '');
            setYVar(restoredState.params.yVar || '');
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

    const availableForM = useMemo(() => numericHeaders.filter(h => h !== xVar && h !== yVar), [numericHeaders, xVar, yVar]);
    const availableForY = useMemo(() => numericHeaders.filter(h => h !== xVar && h !== mVar), [numericHeaders, xVar, mVar]);

    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        checks.push({
            label: 'All variables selected',
            passed: xVar !== '' && mVar !== '' && yVar !== '',
            detail: xVar && mVar && yVar ? `X: ${xVar}, M: ${mVar}, Y: ${yVar}` : 'Please select all three variables'
        });

        checks.push({
            label: 'Variables are different',
            passed: xVar !== mVar && xVar !== yVar && mVar !== yVar,
            detail: xVar !== mVar && xVar !== yVar && mVar !== yVar ? 'All variables are unique' : 'X, M, and Y must be different variables'
        });

        checks.push({
            label: 'Sufficient sample size',
            passed: data.length >= 50,
            detail: `n = ${data.length} observations (${data.length >= 100 ? 'Good' : data.length >= 50 ? 'Adequate' : 'Small - may lack power'})`
        });

        return checks;
    }, [data, xVar, mVar, yVar]);

    const allValidationsPassed = dataValidation.every(check => check.passed);

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

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) {
            toast({ variant: 'destructive', title: 'No results to download' });
            return;
        }
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `Moderation_Report_${new Date().toISOString().split('T')[0]}.png`;
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
        if (!analysisResult?.results) return;
        
        const results = analysisResult.results;
        let csvContent = "MODERATION ANALYSIS RESULTS\n";
        csvContent += `X: ${xVar}, M: ${mVar}, Y: ${yVar}\n\n`;
        
        csvContent += "MODEL COMPARISON\n";
        csvContent += Papa.unparse([{
            delta_r2: results.r_squared_change.delta_r2,
            f_change: results.r_squared_change.f_change,
            p_value: results.r_squared_change.p_change,
            significant: results.r_squared_change.p_change < 0.05 ? 'Yes' : 'No'
        }]) + "\n\n";
        
        csvContent += "SIMPLE SLOPES\n";
        csvContent += Papa.unparse(results.simple_slopes.map(s => ({
            level: s.label,
            slope: s.slope,
            p_value: s.p_value,
            significant: s.p_value < 0.05 ? 'Yes' : 'No'
        }))) + "\n";
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Moderation_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, xVar, mVar, yVar, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!xVar || !yVar || !mVar) {
            toast({ variant: 'destructive', title: 'Please select all variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/moderation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, xVar, yVar, mVar, centerMethod: 'mean' })
            });

            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            result.interpretations = generateModerationInterpretations(result.results);
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'Analysis Complete', description: 'Moderation analysis results are ready.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, xVar, yVar, mVar, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/moderation-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    xVar,
                    mVar,
                    yVar,
                    sampleSize: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Moderation_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, xVar, mVar, yVar, data.length, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

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
            <ModerationGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Moderation Analysis</h1>
                    <p className="text-muted-foreground mt-1">Test if the X-Y relationship depends on moderator M</p>
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
                {/* Step 1: Select Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Select Variables</CardTitle>
                                    <CardDescription>Choose X (independent), M (moderator), and Y (dependent)</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Independent Variable (X)</Label>
                                    <Select value={xVar} onValueChange={setXVar}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select X" /></SelectTrigger>
                                        <SelectContent>
                                            {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">The predictor variable</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Moderator (M)</Label>
                                    <Select value={mVar} onValueChange={setMVar}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select M" /></SelectTrigger>
                                        <SelectContent>
                                            {availableForM.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">The boundary condition</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Dependent Variable (Y)</Label>
                                    <Select value={yVar} onValueChange={setYVar}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select Y" /></SelectTrigger>
                                        <SelectContent>
                                            {availableForY.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">The outcome variable</p>
                                </div>
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
                                    <CardDescription>Review your moderation model configuration</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-4">
                                <h4 className="font-medium text-sm">Moderation Model</h4>
                                <div className="flex items-center justify-center gap-2 py-4">
                                    <Badge variant="outline" className="text-base px-4 py-2">{xVar || 'X'}</Badge>
                                    <span className="text-muted-foreground">×</span>
                                    <Badge variant="outline" className="text-base px-4 py-2">{mVar || 'M'}</Badge>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                    <Badge variant="outline" className="text-base px-4 py-2">{yVar || 'Y'}</Badge>
                                </div>
                            </div>

                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Analysis Parameters</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Method:</strong> Hierarchical regression with interaction</p>
                                    <p>• <strong className="text-foreground">Step 1:</strong> Main effects (X + M)</p>
                                    <p>• <strong className="text-foreground">Step 2:</strong> Add interaction (X × M)</p>
                                    <p>• <strong className="text-foreground">Simple slopes:</strong> At -1SD, Mean, +1SD of M</p>
                                    <p>• <strong className="text-foreground">Centering:</strong> Mean-centered variables</p>
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
                                <Network className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                    Hierarchical regression will test if X × M significantly predicts Y beyond main effects.
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
                    const isSignificant = results.r_squared_change.p_change < 0.05;
                    const deltaR2 = results.r_squared_change.delta_r2;
                    const sigSlopes = results.simple_slopes.filter(s => s.p_value < 0.05).length;
                    const lowSlope = results.simple_slopes.find(s => s.label.includes('Low') || s.label.includes('-1'));
                    const highSlope = results.simple_slopes.find(s => s.label.includes('High') || s.label.includes('+1'));

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Result Summary</CardTitle>
                                        <CardDescription>Key findings about when the relationship changes</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isSignificant ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Sparkles className={`w-5 h-5 ${isSignificant ? 'text-primary' : 'text-rose-600'}`} />
                                        Key Findings
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isSignificant ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                            <p className="text-sm">
                                                {isSignificant 
                                                    ? <><strong>{mVar}</strong> changes how <strong>{xVar}</strong> affects <strong>{yVar}</strong> — the relationship is different depending on the context!</>
                                                    : <><strong>{mVar}</strong> doesn&apos;t really change the relationship between <strong>{xVar}</strong> and <strong>{yVar}</strong>.</>}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isSignificant ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                            <p className="text-sm">
                                                {isSignificant && lowSlope && highSlope
                                                    ? highSlope.slope > lowSlope.slope 
                                                        ? <>When {mVar} is high, the effect of {xVar} on {yVar} is <strong>stronger</strong>. When {mVar} is low, the effect is weaker.</>
                                                        : <>When {mVar} is high, the effect of {xVar} on {yVar} is <strong>weaker</strong>. When {mVar} is low, the effect is stronger.</>
                                                    : <>The effect of {xVar} on {yVar} stays roughly the same regardless of {mVar} level.</>}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${isSignificant ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                            <p className="text-sm">
                                                {sigSlopes === results.simple_slopes.length 
                                                    ? `The ${xVar}→${yVar} relationship is significant at all levels of ${mVar}.`
                                                    : sigSlopes === 0 
                                                    ? `The ${xVar}→${yVar} relationship isn't significant at any level of ${mVar}.`
                                                    : `The ${xVar}→${yVar} relationship is only significant at some levels of ${mVar}.`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isSignificant ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {isSignificant ? (
                                            <CheckCircle2 className="w-6 h-6 text-primary" />
                                        ) : (
                                            <AlertTriangle className="w-6 h-6 text-rose-600" />
                                        )}
                                        <div>
                                            <p className="font-semibold">{isSignificant ? "Context Matters!" : "Context Doesn't Matter Much"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isSignificant 
                                                    ? `When planning interventions, consider ${mVar} levels. The same action on ${xVar} will have different effects depending on ${mVar}.` 
                                                    : `You can expect a similar ${xVar}→${yVar} relationship regardless of ${mVar}. Focus on the direct effect.`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <StatisticalSummaryCards results={results} />

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Effect Strength:</span>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span key={star} className={`text-lg ${
                                            (isSignificant && deltaR2 >= 0.1 && star <= 5) || 
                                            (isSignificant && deltaR2 >= 0.05 && star <= 4) || 
                                            (isSignificant && deltaR2 >= 0.02 && star <= 3) ||
                                            (isSignificant && star <= 2) ||
                                            star <= 1 
                                                ? 'text-amber-400' 
                                                : 'text-gray-300 dark:text-gray-600'
                                        }`}>★</span>
                                    ))}
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
                    const isSignificant = results.r_squared_change.p_change < 0.05;
                    const lowSlope = results.simple_slopes.find(s => s.label.includes('Low') || s.label.includes('-1'));
                    const highSlope = results.simple_slopes.find(s => s.label.includes('High') || s.label.includes('+1'));
                    const deltaR2Pct = (results.r_squared_change.delta_r2 * 100).toFixed(1);

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
                                                We asked: Does the effect of <strong className="text-foreground">{xVar}</strong> on <strong className="text-foreground">{yVar}</strong> depend 
                                                on the level of <strong className="text-foreground">{mVar}</strong>? Think of it like: Does the same medicine work differently for different people?
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Does Context Change the Relationship?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {isSignificant 
                                                    ? <>Yes! Knowing {mVar} helps us better predict how {xVar} affects {yVar}. It added <strong className="text-foreground">{deltaR2Pct}%</strong> to our understanding.</>
                                                    : <>Not really. {mVar} only adds <strong className="text-foreground">{deltaR2Pct}%</strong> to our understanding — that&apos;s not much.</>}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">How Does It Change?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {lowSlope && highSlope && isSignificant ? (
                                                    highSlope.slope > lowSlope.slope 
                                                        ? <>When {mVar} is <strong className="text-foreground">high</strong>, {xVar} has a stronger effect on {yVar}. When {mVar} is <strong className="text-foreground">low</strong>, the effect is weaker or even disappears.</>
                                                        : <>When {mVar} is <strong className="text-foreground">low</strong>, {xVar} has a stronger effect on {yVar}. When {mVar} is <strong className="text-foreground">high</strong>, the effect is weaker — {mVar} acts as a buffer.</>
                                                ) : (
                                                    <>The effect of {xVar} on {yVar} stays pretty consistent regardless of {mVar} level. No clear pattern of change.</>
                                                )}
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
                                                {isSignificant 
                                                    ? `When making decisions about ${xVar}, you should also consider ${mVar}. A one-size-fits-all approach won't work — tailor your strategy based on ${mVar} levels.` 
                                                    : `You don't need to worry about ${mVar} when thinking about how ${xVar} affects ${yVar}. The relationship is the same across different contexts.`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${isSignificant ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        {isSignificant ? (
                                            <><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line: Context Matters</>
                                        ) : (
                                            <><AlertTriangle className="w-5 h-5 text-rose-600" /> Bottom Line: One-Size-Fits-All</>
                                        )}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {isSignificant 
                                            ? `The ${xVar}→${yVar} relationship depends on ${mVar}. Consider this when designing interventions or making predictions.` 
                                            : `The ${xVar}→${yVar} relationship doesn't depend on ${mVar}. You can apply the same strategy across all ${mVar} levels.`}
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4" />Effect Size Guide
                                    </h4>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">10%+</p>
                                            <p className="text-muted-foreground">Large</p>
                                        </div>
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">5%+</p>
                                            <p className="text-muted-foreground">Medium</p>
                                        </div>
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">2%+</p>
                                            <p className="text-muted-foreground">Small</p>
                                        </div>
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">&lt;2%</p>
                                            <p className="text-muted-foreground">Tiny</p>
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
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                                        <Code className="mr-2 h-4 w-4" />Python Code
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-muted-foreground">
                                        <FileText className="mr-2 h-4 w-4" />PDF Report<Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b">
                                <h2 className="text-2xl font-bold">Moderation Analysis Report</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    X: {xVar} | M: {mVar} | Y: {yVar} | Generated: {new Date().toLocaleDateString()}
                                </p>
                            </div>

                            <StatisticalSummaryCards results={results} />

                            {/* Detailed Analysis */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Detailed Analysis</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                        <div className="flex items-center gap-2 mb-4">
                                            <BookOpen className="h-4 w-4 text-primary" />
                                            <h3 className="font-semibold">Overall Analysis</h3>
                                        </div>
                                        <div className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: analysisResult?.interpretations?.overall_analysis || '' }} />
                                    </div>

                                    {analysisResult?.interpretations?.interaction_insights && (
                                        <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                <h3 className="font-semibold">Key Insights</h3>
                                            </div>
                                            <ul className="space-y-2">
                                                {analysisResult.interpretations.interaction_insights.map((insight, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                        <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                                                        <div dangerouslySetInnerHTML={{ __html: insight }} />
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                            <h3 className="font-semibold">Recommendations</h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{analysisResult?.interpretations?.recommendations}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Visualization */}
                            {analysisResult?.plot && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Visualization</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Image src={analysisResult.plot} alt="Moderation Plot" width={800} height={600} className="w-full rounded-md border" />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Simple Slopes Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Simple Slopes Analysis</CardTitle>
                                    <CardDescription>X-Y relationship at different moderator levels</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Moderator Level</TableHead>
                                                <TableHead className="text-right">Slope</TableHead>
                                                <TableHead className="text-right">p-value</TableHead>
                                                <TableHead className="text-right">Significance</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.simple_slopes.map(slope => (
                                                <TableRow key={slope.label}>
                                                    <TableCell className="font-semibold">{slope.label}</TableCell>
                                                    <TableCell className="text-right font-mono">{slope.slope.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{slope.p_value < 0.001 ? '<.001' : slope.p_value.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={slope.p_value < 0.05 ? 'default' : 'secondary'}>
                                                            {slope.p_value < 0.05 ? 'Significant' : 'Not Sig.'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Model Comparison */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Model Comparison</CardTitle>
                                    <CardDescription>Hierarchical regression results</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Model</TableHead>
                                                <TableHead className="text-right">ΔR²</TableHead>
                                                <TableHead className="text-right">F-Change</TableHead>
                                                <TableHead className="text-right">p-value</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>Step 1: Main Effects (X, M)</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                                <TableCell className="text-right font-mono">—</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>Step 2: + Interaction (X×M)</TableCell>
                                                <TableCell className="text-right font-mono">{results.r_squared_change.delta_r2.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{results.r_squared_change.f_change.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{results.r_squared_change.p_change < 0.001 ? '<.001' : results.r_squared_change.p_change.toFixed(4)}</TableCell>
                                            </TableRow>
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

            {/* Python Code Modal */}
            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />

            {/* Glossary Modal */}
            <GlossaryModal 
                isOpen={glossaryModalOpen}
                onClose={() => setGlossaryModalOpen(false)}
            />
        </div>
    );
}


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
import { Loader2, HelpCircle, Wrench, CheckCircle, FileType, BookOpen, Info, Lightbulb, Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, ChevronDown, ArrowRight, Target, TrendingUp, Link, Unlink, FlaskConical, Scale, Activity, Hash, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components//ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components//ui/select';
import { Badge } from '@/components//ui/badge';
import { ScrollArea } from '@/components//ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components//ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/instrumental_variable.py?alt=media";

// IV 관련 용어 정의
const ivTermDefinitions: Record<string, string> = {
    "Instrumental Variable (IV)": "A variable that is correlated with the endogenous explanatory variable but uncorrelated with the error term. Used to isolate exogenous variation for causal inference.",
    "Two-Stage Least Squares (2SLS)": "An estimation method that uses instruments to address endogeneity. First stage predicts the endogenous variable from instruments; second stage uses predictions to estimate causal effects.",
    "Endogenous Variable": "An explanatory variable that is correlated with the error term, often due to omitted variables, simultaneity, or measurement error. This correlation biases OLS estimates.",
    "Exogenous Variable": "A variable that is uncorrelated with the error term. Exogenous controls can be included in both stages of 2SLS.",
    "First Stage": "The regression of the endogenous variable on the instruments (and controls). Tests whether instruments are relevant predictors of the endogenous variable.",
    "Second Stage": "The regression of the outcome on the predicted values of the endogenous variable (and controls). Provides the causal effect estimate.",
    "F-Statistic (First Stage)": "Tests joint significance of instruments in the first stage. Values below 10 suggest weak instruments (Stock-Yogo rule of thumb).",
    "Weak Instruments": "Instruments that are only weakly correlated with the endogenous variable. Weak instruments cause biased IV estimates and unreliable standard errors.",
    "Stock-Yogo Critical Value": "A threshold (commonly 10) for the first-stage F-statistic. Values above this threshold indicate sufficiently strong instruments.",
    "Relevance Condition": "The requirement that instruments must be correlated with the endogenous variable. Testable via first-stage F-statistic.",
    "Exclusion Restriction": "The requirement that instruments affect the outcome only through the endogenous variable, not directly. This assumption is untestable.",
    "Independence Assumption": "The requirement that instruments are uncorrelated with the error term (unconfounded). This assumption is generally untestable.",
    "Overidentification": "When there are more instruments than endogenous variables. Allows testing whether instruments are valid using Sargan/Hansen tests.",
    "Sargan-Hansen Test": "A test for overidentifying restrictions. Tests whether instruments are uncorrelated with the structural error. Only valid with more instruments than endogenous variables.",
    "Endogeneity Test": "Tests whether the endogenous variable is actually endogenous (Durbin-Wu-Hausman test). If not rejected, OLS may be preferred.",
    "Local Average Treatment Effect (LATE)": "The effect identified by IV: the causal effect for 'compliers' — units whose treatment status is affected by the instrument.",
    "OLS Estimate": "Ordinary Least Squares estimate, which is biased when explanatory variables are endogenous. Used as comparison to IV estimate.",
    "Bias Correction": "The difference between OLS and IV estimates, indicating the magnitude of endogeneity bias corrected by IV.",
    "Standard Error": "A measure of the precision of the coefficient estimate. IV standard errors are typically larger than OLS due to reduced effective variation.",
    "Confidence Interval": "A range of values that likely contains the true causal effect. Wider intervals indicate less precise estimates."
};

interface Coefficient { term: string; estimate: number; std_error: number; t_value: number; p_value: number; ci_lower: number; ci_upper: number; }
interface InstrumentCoef { instrument: string; coefficient: number; std_error: number; t_value: number; p_value: number; significant: boolean; }
interface OLSResult { coefficients: Coefficient[]; endogenous_effect: number; endogenous_se: number; endogenous_pvalue: number; r_squared: number; adj_r_squared: number; n_obs: number; }
interface FirstStage { instrument_coefficients: InstrumentCoef[]; f_statistic: number; f_pvalue: number; weak_instrument: boolean; r_squared: number; }
interface IVResult { coefficients: Coefficient[]; endogenous_effect: number; endogenous_se: number; endogenous_pvalue: number; endogenous_ci: number[]; endogenous_tvalue?: number; significant: boolean; r_squared: number; n_obs: number; }
interface DiagnosticTest { test?: string; message: string; p_value?: number; [key: string]: any; }
interface Diagnostics { weak_instrument_test: DiagnosticTest; overidentification_test: DiagnosticTest; endogeneity_test: DiagnosticTest; }
interface KeyInsight { title: string; description: string; status: string; }
interface Interpretation { key_insights: KeyInsight[]; recommendation: string; }
interface AnalysisResults { ols_result: OLSResult; first_stage: FirstStage; iv_result: IVResult; diagnostics: Diagnostics; descriptive_stats: { n_obs: number; n_instruments: number; n_exogenous: number; outcome_mean: number; outcome_std: number; endogenous_mean: number; endogenous_std: number; }; first_stage_plot: string | null; comparison_plot: string | null; residual_plot: string | null; strength_plot: string | null; interpretation: Interpretation; }

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS = [{ id: 1, label: 'Variables' }, { id: 2, label: 'Settings' }, { id: 3, label: 'Validation' }, { id: 4, label: 'Summary' }, { id: 5, label: 'Reasoning' }, { id: 6, label: 'Statistics' }];

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
        link.download = 'instrumental_variable.py';
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
                        Python Code - Instrumental Variable Analysis
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
                        IV Analysis Terms Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in Instrumental Variable analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(ivTermDefinitions).map(([term, definition]) => (
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

// Decision Tree 스타일의 통계 요약 카드 컴포넌트
const StatisticalSummaryCards = ({ results }: { results: AnalysisResults }) => {
    const iv = results.iv_result;
    const fs = results.first_stage;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">IV Effect</p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{iv.endogenous_effect?.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">SE: {iv.endogenous_se?.toFixed(3)}</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">p-value</p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${iv.endogenous_pvalue < 0.05 ? 'text-primary' : ''}`}>
                            {iv.endogenous_pvalue < 0.001 ? '< .001' : iv.endogenous_pvalue?.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">{iv.significant ? 'Significant' : 'Not significant'}</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">First Stage F</p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${!fs.weak_instrument ? 'text-primary' : 'text-destructive'}`}>
                            {fs.f_statistic?.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">{fs.weak_instrument ? 'Weak instrument' : 'Strong instrument'}</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">95% CI</p>
                            <Hash className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono text-sm">
                            [{iv.endogenous_ci?.[0]?.toFixed(2)}, {iv.endogenous_ci?.[1]?.toFixed(2)}]
                        </p>
                        <p className="text-xs text-muted-foreground">Confidence interval</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const IVGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Instrumental Variable Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is IV */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                What is Instrumental Variable Analysis?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Instrumental Variable (IV) analysis addresses <strong>endogeneity</strong> — when an 
                explanatory variable is correlated with the error term, biasing OLS estimates. 
                IV uses an <strong>instrument (Z)</strong> that affects Y only through X.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The Problem:</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Y = β₀ + β₁X + ε, but Cor(X, ε) ≠ 0<br/><br/>
                    Sources of endogeneity:
                    <br/>• Omitted variable bias (confounders)
                    <br/>• Simultaneity (reverse causation)
                    <br/>• Measurement error
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* How 2SLS Works */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                How Two-Stage Least Squares (2SLS) Works
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="space-y-3 text-sm">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <p className="font-medium text-primary mb-1">Stage 1: First Stage</p>
                    <p className="text-xs font-mono text-muted-foreground">X = π₀ + π₁Z + γW + v</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Regress X on instrument(s) Z and controls W.<br/>
                      Get predicted values X̂ (exogenous part of X).
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <p className="font-medium text-primary mb-1">Stage 2: Second Stage</p>
                    <p className="text-xs font-mono text-muted-foreground">Y = β₀ + β₁X̂ + δW + ε</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Regress Y on X̂ (not original X) and controls W.<br/>
                      β₁ is the causal effect (if assumptions hold).
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  <strong>Why does this work?</strong> By using only the variation in X that comes from Z, 
                  we isolate exogenous variation and eliminate the correlation with ε.
                </p>
              </div>
            </div>

            <Separator />

            {/* IV Requirements */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Valid Instrument Requirements
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary">1. Relevance (Testable)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Instrument must be <strong>correlated with X</strong>
                    <br/><br/>
                    <strong>Test:</strong> First-stage F-statistic ≥ 10
                    <br/>• F &lt; 10 = "weak instrument" problem
                    <br/>• Weak instruments → biased IV, unreliable SEs
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">2. Exclusion Restriction (Not Testable!)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Instrument affects Y <strong>only through X</strong>
                    <br/><br/>
                    • No direct effect of Z on Y
                    <br/>• Cannot be tested statistically
                    <br/>• Must be argued based on theory/design
                    <br/>• Most common IV failure mode
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">3. Independence (Not Testable)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Instrument is <strong>uncorrelated with error term</strong>
                    <br/><br/>
                    • Z not affected by same confounders as X
                    <br/>• Random/quasi-random variation in Z is ideal
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Understanding Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Understanding IV Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">First-Stage F-Statistic</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tests instrument relevance (correlation with X).
                    <br/>• <strong>F ≥ 10:</strong> Strong instruments (rule of thumb)
                    <br/>• <strong>F &lt; 10:</strong> Weak instruments — interpret with caution
                    <br/>• <strong>F ~ 0:</strong> Irrelevant instruments — IV fails
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">IV Effect (2SLS Coefficient)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The causal effect of X on Y (assuming valid IV).
                    <br/>• Larger SE than OLS (uses less variation)
                    <br/>• Interpret as LATE (Local Average Treatment Effect)
                    <br/>• Effect for "compliers" whose X is affected by Z
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">OLS vs IV Comparison</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Large difference:</strong> Substantial endogeneity corrected
                    <br/><strong>Small difference:</strong> OLS may be adequate
                    <br/><br/>
                    Direction of difference indicates bias direction:
                    <br/>• IV &gt; OLS: OLS underestimated (negative bias)
                    <br/>• IV &lt; OLS: OLS overestimated (positive bias)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Overidentification Test (Sargan/Hansen)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When # instruments &gt; # endogenous variables:
                    <br/>• Tests if instruments are valid (uncorrelated with ε)
                    <br/>• <strong>p &gt; 0.05:</strong> Cannot reject validity (good)
                    <br/>• <strong>p &lt; 0.05:</strong> At least one instrument may be invalid
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Weak Instruments */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                The Weak Instrument Problem
              </h3>
              <div className="p-4 rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20">
                <p className="text-sm text-rose-700 dark:text-rose-400 mb-2">
                  <strong>When F &lt; 10, IV estimates are unreliable:</strong>
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• IV coefficient biased toward OLS</li>
                  <li>• Standard errors too small (wrong inference)</li>
                  <li>• Confidence intervals have poor coverage</li>
                  <li>• t-tests and Wald tests unreliable</li>
                </ul>
                <div className="mt-3 p-2 rounded bg-background border border-rose-200 dark:border-rose-800">
                  <p className="text-xs text-muted-foreground">
                    <strong>Solutions:</strong>
                    <br/>• Find stronger instruments
                    <br/>• Use LIML instead of 2SLS
                    <br/>• Use weak-instrument robust inference (Anderson-Rubin)
                    <br/>• Consider alternative identification strategies
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Common Instruments */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Common Instrument Examples
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Education → Wages</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Instrument:</strong> Distance to college
                    <br/><strong>Logic:</strong> Distance affects education but not wages directly
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Military Service → Earnings</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Instrument:</strong> Vietnam draft lottery
                    <br/><strong>Logic:</strong> Lottery is random, affects earnings only through service
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Attendance → Test Scores</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Instrument:</strong> Weather on test day
                    <br/><strong>Logic:</strong> Weather affects attendance but not ability
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Institutional Quality → Growth</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Instrument:</strong> Colonial settler mortality
                    <br/><strong>Logic:</strong> Historical mortality affected institutions
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
                    <li>• Report first-stage F-statistic</li>
                    <li>• Compare OLS and IV estimates</li>
                    <li>• Argue for exclusion restriction</li>
                    <li>• Run overidentification test</li>
                    <li>• Check for weak instruments</li>
                    <li>• Report both OLS and IV SEs</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Don't</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use IV with F &lt; 10 without caution</li>
                    <li>• Assume exclusion holds without argument</li>
                    <li>• Ignore large OLS-IV differences</li>
                    <li>• Use instruments that directly affect Y</li>
                    <li>• Add weak instruments to "boost" F</li>
                    <li>• Over-interpret with many instruments</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• First-stage regression results</li>
                    <li>• F-statistic for instrument strength</li>
                    <li>• Both OLS and IV coefficients</li>
                    <li>• Standard errors and confidence intervals</li>
                    <li>• Overidentification test (if applicable)</li>
                    <li>• Argument for exclusion restriction</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">LATE Interpretation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• IV identifies LATE, not ATE</li>
                    <li>• Effect for "compliers" only</li>
                    <li>• Compliers: X changes with Z</li>
                    <li>• May not generalize to full population</li>
                    <li>• Different instruments → different LATEs</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> IV is powerful but demanding. 
                The exclusion restriction cannot be tested — it must be argued convincingly based on 
                theory and research design. Always check for weak instruments (F ≥ 10) and report 
                both OLS and IV estimates. The IV effect is a LATE for compliers, which may differ 
                from the ATE for the full population.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const ivExample = exampleDatasets.find(d => d.id === 'iv-data' || d.id === 'causal');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Wrench className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Instrumental Variable Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">Estimate causal effects when endogeneity is present using 2SLS</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2"><CardHeader><Unlink className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Fix Endogeneity</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Address omitted variable bias</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><Link className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Instrument</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Z affects X but not Y directly</p></CardContent></Card>
                        <Card className="border-2"><CardHeader><FlaskConical className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">2SLS</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Two-Stage Least Squares</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5" />IV Model</h3>
                        <div className="space-y-2 p-4 bg-background rounded-lg font-mono text-sm">
                            <p><strong>1st Stage:</strong> X = π·Z + γ·W + v</p>
                            <p><strong>2nd Stage:</strong> Y = β·X̂ + δ·W + ε</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6 text-sm mt-4">
                            <div><h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" />Valid Instrument Requirements</h4><ul className="text-muted-foreground space-y-1"><li>• <strong>Relevance:</strong> Z correlated with X</li><li>• <strong>Exclusion:</strong> Z affects Y only through X</li><li>• <strong>Independence:</strong> Z uncorrelated with error</li></ul></div>
                            <div><h4 className="font-semibold mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Common Examples</h4><ul className="text-muted-foreground space-y-1"><li>• Distance to college → Education</li><li>• Draft lottery → Military service</li><li>• Weather → Attendance</li></ul></div>
                        </div>
                    </div>
                    {ivExample && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(ivExample)} size="lg"><Wrench className="mr-2 h-5 w-5" />Load Example Data</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface IVAnalysisPageProps { data: DataSet; allHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; }

export default function IVAnalysisPage({ data, allHeaders, onLoadExample }: IVAnalysisPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    const [outcomeCol, setOutcomeCol] = useState<string | undefined>();
    const [endogenousCol, setEndogenousCol] = useState<string | undefined>();
    const [instrumentCols, setInstrumentCols] = useState<string[]>([]);
    const [exogenousCols, setExogenousCols] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);

    // Modal states
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length >= 30 && allHeaders.length >= 3, [data, allHeaders]);
    const numericHeaders = useMemo(() => {
        if (data.length === 0) return [];
        return allHeaders.filter(h => { const values = data.slice(0, 10).map(row => row[h]); return values.some(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== '')); });
    }, [data, allHeaders]);

    const availableForInstrument = useMemo(() => numericHeaders.filter(h => h !== outcomeCol && h !== endogenousCol && !exogenousCols.includes(h)), [numericHeaders, outcomeCol, endogenousCol, exogenousCols]);
    const availableForExogenous = useMemo(() => numericHeaders.filter(h => h !== outcomeCol && h !== endogenousCol && !instrumentCols.includes(h)), [numericHeaders, outcomeCol, endogenousCol, instrumentCols]);

    const validationChecks = useMemo(() => [
        { label: 'Outcome variable (Y)', passed: !!outcomeCol, message: outcomeCol || 'Select outcome' },
        { label: 'Endogenous variable (X)', passed: !!endogenousCol, message: endogenousCol || 'Select endogenous' },
        { label: 'Instrument(s) (Z)', passed: instrumentCols.length >= 1, message: `${instrumentCols.length} selected` },
        { label: 'Sample size', passed: data.length >= 30, message: `n = ${data.length}` },
    ], [outcomeCol, endogenousCol, instrumentCols, data.length]);

    const allChecksPassed = validationChecks.every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep === 3) handleAnalysis(); else if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        setOutcomeCol(numericHeaders.find(h => h.toLowerCase().includes('outcome') || h.toLowerCase() === 'y' || h.toLowerCase().includes('wage') || h.toLowerCase().includes('earn')));
        setEndogenousCol(numericHeaders.find(h => h.toLowerCase().includes('educ') || h.toLowerCase() === 'x' || h.toLowerCase().includes('treatment')));
        setInstrumentCols(numericHeaders.filter(h => h.toLowerCase().includes('instrument') || h.toLowerCase() === 'z' || h.toLowerCase().includes('distance')).slice(0, 2));
        setExogenousCols([]);
        setAnalysisResult(null); setView(canRun ? 'main' : 'intro'); setCurrentStep(1); setMaxReachedStep(1);
    }, [allHeaders, numericHeaders, canRun]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true); toast({ title: "Generating image..." });
        try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `IV_Report_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
        catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        const iv = analysisResult.iv_result;
        const ols = analysisResult.ols_result;
        let csv = `INSTRUMENTAL VARIABLE ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\n\nOLS ESTIMATE\nEffect,${ols.endogenous_effect?.toFixed(4)}\np-value,${ols.endogenous_pvalue?.toFixed(4)}\n\nIV (2SLS) ESTIMATE\nEffect,${iv.endogenous_effect?.toFixed(4)}\nSE,${iv.endogenous_se?.toFixed(4)}\np-value,${iv.endogenous_pvalue?.toFixed(4)}\n95% CI,[${iv.endogenous_ci?.[0]?.toFixed(3)}, ${iv.endogenous_ci?.[1]?.toFixed(3)}]\n\n`;
        csv += `FIRST STAGE\nF-statistic,${analysisResult.first_stage.f_statistic?.toFixed(2)}\nWeak Instrument,${analysisResult.first_stage.weak_instrument}\n\nINSTRUMENT COEFFICIENTS\n` + Papa.unparse(analysisResult.first_stage.instrument_coefficients);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `IV_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const handleDownloadWord = useCallback(() => {
        if (!analysisResult) return;
        const iv = analysisResult.iv_result;
        const ols = analysisResult.ols_result;
        const fs = analysisResult.first_stage;
        const sig = iv.significant;
        const content = `Instrumental Variable (2SLS) Analysis Report\nGenerated: ${new Date().toLocaleString()}\n\nSUMMARY\nIV Effect: ${iv.endogenous_effect?.toFixed(3)}\nStandard Error: ${iv.endogenous_se?.toFixed(3)}\nt-statistic: ${iv.endogenous_tvalue?.toFixed(2)}\np-value: ${iv.endogenous_pvalue < 0.001 ? '< .001' : iv.endogenous_pvalue?.toFixed(4)}\n95% CI: [${iv.endogenous_ci?.[0]?.toFixed(2)}, ${iv.endogenous_ci?.[1]?.toFixed(2)}]\nOLS Effect: ${ols.endogenous_effect?.toFixed(3)}\nResult: ${sig ? 'Significant effect' : 'No significant effect'}\n\nFIRST STAGE\nF-statistic: ${fs.f_statistic?.toFixed(2)}\nWeak Instrument: ${fs.weak_instrument ? 'Yes' : 'No'}\n\nMODEL FIT\nOLS R²: ${ols.r_squared?.toFixed(3)}\nIV R²: ${iv.r_squared?.toFixed(3)}`;
        const blob = new Blob([content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'iv_report.doc'; a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Word Document Downloaded" });
    }, [analysisResult, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!outcomeCol || !endogenousCol || instrumentCols.length < 1) { toast({ variant: 'destructive', title: 'Error', description: 'Select required variables.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const res = await fetch(`${FASTAPI_URL}/api/analysis/instrumental-variable`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, outcome_col: outcomeCol, endogenous_col: endogenousCol, instrument_cols: instrumentCols, exogenous_cols: exogenousCols.length > 0 ? exogenousCols : null }) });
            if (!res.ok) throw new Error((await res.json()).detail || 'Analysis failed');
            const result = await res.json(); if (result.error) throw new Error(result.error);
            setAnalysisResult(result); goToStep(4);
            toast({ title: 'Analysis Complete', description: `IV effect = ${result.iv_result.endogenous_effect?.toFixed(3)}` });
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
        finally { setIsLoading(false); }
    }, [data, outcomeCol, endogenousCol, instrumentCols, exogenousCols, toast]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;
    const results = analysisResult;

    const ProgressBar = () => (
        <div className="mb-8"><div className="flex items-center justify-between w-full gap-2">
            {STEPS.map((step) => {
                const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!results);
                const isCurrent = currentStep === step.id;
                const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!results);
                return (
                    <button key={step.id} onClick={() => isAccessible && goToStep(step.id as Step)} disabled={!isAccessible} className={`flex flex-col items-center gap-2 transition-all flex-1 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
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
            <IVGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Instrumental Variable</h1>
                    <p className="text-muted-foreground mt-1">2SLS estimation for causal inference</p>
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
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose outcome, endogenous, and instruments</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3"><Label className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Outcome (Y)</Label><Select value={outcomeCol} onValueChange={setOutcomeCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select outcome..." /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-3"><Label className="flex items-center gap-2"><Unlink className="w-4 h-4 text-primary" />Endogenous (X)</Label><Select value={endogenousCol} onValueChange={setEndogenousCol}><SelectTrigger className="h-11"><SelectValue placeholder="Select endogenous..." /></SelectTrigger><SelectContent>{numericHeaders.filter(h => h !== outcomeCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            <div className="space-y-3">
                                <Label className="flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" />Instruments (Z)</Label>
                                <ScrollArea className="h-32 border rounded-xl p-4">
                                    <div className="space-y-2">{availableForInstrument.map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`inst-${h}`} checked={instrumentCols.includes(h)} onCheckedChange={(c) => { if (c) setInstrumentCols(prev => [...prev, h]); else setInstrumentCols(prev => prev.filter(x => x !== h)); }} /><label htmlFor={`inst-${h}`} className="text-sm cursor-pointer">{h}</label></div>))}</div>
                                </ScrollArea>
                                <p className="text-xs text-muted-foreground">Selected: {instrumentCols.length} instrument(s)</p>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground" /><p className="text-sm text-muted-foreground">Sample size: <strong>{data.length}</strong> observations</p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!outcomeCol || !endogenousCol || instrumentCols.length < 1}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Control Variables</CardTitle><CardDescription>Optional exogenous controls</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label>Exogenous Controls (W) - optional</Label>
                                <ScrollArea className="h-40 border rounded-xl p-4">
                                    <div className="space-y-2">{availableForExogenous.map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`exog-${h}`} checked={exogenousCols.includes(h)} onCheckedChange={(c) => { if (c) setExogenousCols(prev => [...prev, h]); else setExogenousCols(prev => prev.filter(x => x !== h)); }} /><label htmlFor={`exog-${h}`} className="text-sm cursor-pointer">{h}</label></div>))}</div>
                                </ScrollArea>
                                <p className="text-xs text-muted-foreground">Selected: {exogenousCols.length} controls</p>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" />Model Summary</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li><strong>Outcome:</strong> {outcomeCol}</li>
                                    <li><strong>Endogenous:</strong> {endogenousCol}</li>
                                    <li><strong>Instruments:</strong> {instrumentCols.join(', ')}</li>
                                    <li><strong>Controls:</strong> {exogenousCols.length > 0 ? exogenousCols.join(', ') : 'None'}</li>
                                </ul>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {validationChecks.map((check, idx) => (
                                    <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>
                                        {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
                                        <div><p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.message}</p></div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <FlaskConical className="w-5 h-5 text-primary" />
                                <p className="text-sm text-muted-foreground">2SLS will estimate causal effect by using instruments to address endogeneity.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Estimating...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}</Button></CardFooter>
                    </Card>
                )}

                {currentStep === 4 && results && (() => {
                    const iv = results.iv_result;
                    const ols = results.ols_result;
                    const fs = results.first_stage;
                    const isGood = iv.significant && !fs.weak_instrument;
                    const biasPercent = ((ols.endogenous_effect - iv.endogenous_effect) / ols.endogenous_effect * 100);
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>IV (2SLS) vs OLS comparison</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${isGood ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 border-amber-300'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${isGood ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <p className="text-sm">• IV (2SLS) effect estimate: <strong>{iv.endogenous_effect?.toFixed(3)}</strong> (SE = {iv.endogenous_se?.toFixed(3)})</p>
                                        <p className="text-sm">• OLS (naive) effect estimate: <strong>{ols.endogenous_effect?.toFixed(3)}</strong> — bias of {Math.abs(biasPercent).toFixed(1)}%</p>
                                        <p className="text-sm">• First-stage F-statistic: <strong>{fs.f_statistic?.toFixed(1)}</strong> — {fs.weak_instrument ? 'weak instrument warning' : 'strong instruments'}</p>
                                        <p className="text-sm">• Statistical significance: <strong>p {iv.endogenous_pvalue < 0.001 ? '< .001' : `= ${iv.endogenous_pvalue?.toFixed(4)}`}</strong></p>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border flex items-start gap-3 ${isGood ? 'bg-primary/5 border-primary/30' : fs.weak_instrument ? 'bg-rose-50/50 border-rose-300 dark:bg-rose-950/20' : 'bg-amber-50/50 border-amber-300 dark:bg-amber-950/20'}`}>
                                    {isGood ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                                    <div>
                                        <p className="font-semibold">{isGood ? "Valid Causal Estimate!" : fs.weak_instrument ? "Weak Instrument Warning" : "Effect Not Significant"}</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {isGood 
                                                ? "Strong instruments and significant IV effect suggest reliable causal interpretation." 
                                                : fs.weak_instrument 
                                                    ? "F-statistic < 10 indicates weak instruments. Consider stronger instruments or alternative methods."
                                                    : "The IV effect is not statistically significant at conventional levels."}
                                        </p>
                                    </div>
                                </div>
                                <div className="rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 border">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Evidence</h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p>• 95% CI: [{iv.endogenous_ci?.[0]?.toFixed(2)}, {iv.endogenous_ci?.[1]?.toFixed(2)}] — {iv.significant ? 'excludes zero' : 'includes zero'}</p>
                                        <p>• OLS vs IV difference: {Math.abs(biasPercent).toFixed(1)}% — {Math.abs(biasPercent) > 20 ? 'substantial endogeneity correction' : 'modest adjustment'}</p>
                                        <p>• Instrument strength: F = {fs.f_statistic?.toFixed(1)} — {fs.f_statistic >= 10 ? 'passes Stock-Yogo threshold' : 'below recommended threshold'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Reliability:</span>
                                    {[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= (isGood ? 5 : fs.weak_instrument ? 2 : iv.significant ? 4 : 3) ? 'text-amber-400' : 'text-gray-300'}`}>★</span>)}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end"><Button onClick={nextStep} size="lg">Why This Result?<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 5 && results && (() => {
                    const iv = results.iv_result;
                    const fs = results.first_stage;
                    const isGood = iv.significant && !fs.weak_instrument;
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Result?</CardTitle><CardDescription>Understanding IV estimation</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
                                        <div><h4 className="font-semibold mb-1">How IV (2SLS) Works</h4><p className="text-sm text-muted-foreground">Instrumental variable estimation isolates exogenous variation in the endogenous variable using instruments. The first stage predicts X from Z, and the second stage uses predicted X̂ to estimate the causal effect on Y.</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
                                        <div><h4 className="font-semibold mb-1">First Stage Strength</h4><p className="text-sm text-muted-foreground">F-statistic of {fs.f_statistic?.toFixed(1)} {fs.f_statistic >= 10 ? 'exceeds' : 'falls below'} the Stock-Yogo threshold of 10. {fs.f_statistic >= 10 ? 'Instruments are sufficiently strong for reliable inference.' : 'Weak instruments can lead to biased estimates and unreliable standard errors.'}</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div>
                                        <div><h4 className="font-semibold mb-1">Endogeneity Correction</h4><p className="text-sm text-muted-foreground">The difference between OLS ({results.ols_result.endogenous_effect?.toFixed(3)}) and IV ({iv.endogenous_effect?.toFixed(3)}) estimates indicates the degree of endogeneity bias. {Math.abs(results.ols_result.endogenous_effect - iv.endogenous_effect) > 0.3 ? 'Substantial correction suggests important confounding was present.' : 'Modest correction suggests limited confounding.'}</p></div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div>
                                        <div><h4 className="font-semibold mb-1">Practical Interpretation</h4><p className="text-sm text-muted-foreground">{isGood ? `The IV estimate of ${iv.endogenous_effect?.toFixed(3)} can be interpreted causally: a one-unit increase in ${endogenousCol} causes a ${iv.endogenous_effect?.toFixed(3)} unit change in ${outcomeCol}, holding other factors constant.` : 'Interpret with caution due to weak instruments or insignificant effect. Consider alternative identification strategies or additional instruments.'}</p></div>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-5 border ${isGood ? 'bg-primary/5 border-primary/30' : 'bg-amber-50/50 border-amber-300 dark:bg-amber-950/20'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">{isGood ? <><CheckCircle2 className="w-5 h-5 text-primary" />Reliable Causal Estimate</> : <><AlertTriangle className="w-5 h-5 text-amber-600" />Interpret with Caution</>}</h4>
                                    <p className="text-sm text-muted-foreground">{isGood ? `IV assumptions appear satisfied. Effect of ${iv.endogenous_effect?.toFixed(3)} (p ${iv.endogenous_pvalue < 0.001 ? '< .001' : `= ${iv.endogenous_pvalue?.toFixed(4)}`}) is interpretable as causal.` : 'One or more validity conditions may be violated. Consider instrument strength and exclusion restriction carefully.'}</p>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                        </Card>
                    );
                })()}

                {currentStep === 6 && results && (() => {
                    const iv = results.iv_result;
                    const ols = results.ols_result;
                    const fs = results.first_stage;
                    const sig = iv.significant;
                    return (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full IV report</p></div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadWord}><FileType className="mr-2 h-4 w-4" />Word Document</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}><Code className="mr-2 h-4 w-4" />Python Code</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b">
                                <h2 className="text-2xl font-bold">Instrumental Variable Analysis Report</h2>
                                <p className="text-sm text-muted-foreground mt-1">n = {results.descriptive_stats.n_obs} | {results.descriptive_stats.n_instruments} instrument(s) | {new Date().toLocaleDateString()}</p>
                            </div>
                            
                            <StatisticalSummaryCards results={results} />

                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Scale className="w-5 h-5" />OLS vs IV Comparison</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                                            <p className="text-sm text-muted-foreground mb-1">OLS (Naive)</p>
                                            <p className="text-2xl font-bold">{ols.endogenous_effect?.toFixed(3)}</p>
                                            <p className="text-xs text-muted-foreground">SE: {ols.endogenous_se?.toFixed(3)}</p>
                                        </div>
                                        <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                                            <p className="text-sm text-muted-foreground mb-1">IV (2SLS)</p>
                                            <p className="text-2xl font-bold text-primary">{iv.endogenous_effect?.toFixed(3)}</p>
                                            <p className="text-xs text-muted-foreground">SE: {iv.endogenous_se?.toFixed(3)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 p-3 bg-muted/30 rounded-lg text-center">
                                        <p className="text-sm text-muted-foreground">
                                            Bias correction: <strong>{Math.abs(((ols.endogenous_effect - iv.endogenous_effect) / ols.endogenous_effect) * 100).toFixed(1)}%</strong>
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Detailed Analysis</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                        <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /><h3 className="font-semibold">Statistical Summary</h3></div>
                                        <div className="space-y-3">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                Two-stage least squares (2SLS) instrumental variable regression was conducted to address potential endogeneity in the relationship between {endogenousCol} and the outcome variable. The analysis used <em>N</em> = {results.descriptive_stats.n_obs} observations with {results.descriptive_stats.n_instruments} instrument{results.descriptive_stats.n_instruments > 1 ? 's' : ''}.
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                The first-stage regression examining instrument relevance yielded <em>F</em> = {fs.f_statistic?.toFixed(2)}, which {fs.weak_instrument ? 'falls below' : 'exceeds'} the Stock-Yogo weak instrument threshold of 10, {fs.weak_instrument ? 'indicating potential weak instrument bias' : 'suggesting adequate instrument strength'}. {fs.instrument_coefficients?.filter(c => c.significant).length === fs.instrument_coefficients?.length ? 'All instruments were significantly associated with the endogenous regressor.' : `${fs.instrument_coefficients?.filter(c => c.significant).length} of ${fs.instrument_coefficients?.length} instruments showed significant first-stage coefficients.`}
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                The OLS estimate of the endogenous variable effect was {ols.endogenous_effect?.toFixed(3)} (<em>SE</em> = {ols.endogenous_se?.toFixed(3)}), while the 2SLS estimate was {iv.endogenous_effect?.toFixed(3)} (<em>SE</em> = {iv.endogenous_se?.toFixed(3)}), 95% CI [{iv.endogenous_ci?.[0]?.toFixed(2)}, {iv.endogenous_ci?.[1]?.toFixed(2)}]. The IV effect was {sig ? 'statistically significant' : 'not statistically significant'}, <em>t</em> = {iv.endogenous_tvalue?.toFixed(2)}, <em>p</em> {iv.endogenous_pvalue < 0.001 ? '< .001' : `= ${iv.endogenous_pvalue?.toFixed(3)}`}.
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                The difference between OLS ({ols.endogenous_effect?.toFixed(3)}) and IV ({iv.endogenous_effect?.toFixed(3)}) estimates suggests {Math.abs(ols.endogenous_effect - iv.endogenous_effect) > 0.5 * Math.abs(ols.endogenous_effect) ? 'substantial' : 'modest'} endogeneity bias in the OLS regression. {sig ? 'After controlling for endogeneity via instrumental variables, there remains a significant causal effect.' : 'After addressing endogeneity, the effect was not statistically significant, suggesting the OLS relationship may have been confounded.'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
                                <CardContent>
                                    <Tabs defaultValue="comparison" className="w-full">
                                        <TabsList className="grid w-full grid-cols-4">
                                            <TabsTrigger value="comparison">OLS vs IV</TabsTrigger>
                                            <TabsTrigger value="firststage">First Stage</TabsTrigger>
                                            <TabsTrigger value="strength">Instrument Strength</TabsTrigger>
                                            <TabsTrigger value="residual">Residuals</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="comparison" className="mt-4">{results.comparison_plot ? <Image src={`data:image/png;base64,${results.comparison_plot}`} alt="Comparison" width={800} height={500} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent>
                                        <TabsContent value="firststage" className="mt-4">{results.first_stage_plot ? <Image src={`data:image/png;base64,${results.first_stage_plot}`} alt="First Stage" width={800} height={400} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent>
                                        <TabsContent value="strength" className="mt-4">{results.strength_plot ? <Image src={`data:image/png;base64,${results.strength_plot}`} alt="Strength" width={800} height={500} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent>
                                        <TabsContent value="residual" className="mt-4">{results.residual_plot ? <Image src={`data:image/png;base64,${results.residual_plot}`} alt="Residuals" width={800} height={400} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No chart</p>}</TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                            
                            <Card>
                                <CardHeader><CardTitle>2SLS Coefficients</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Term</TableHead>
                                                <TableHead className="text-right">Estimate</TableHead>
                                                <TableHead className="text-right">SE</TableHead>
                                                <TableHead className="text-right">t</TableHead>
                                                <TableHead className="text-right">p-value</TableHead>
                                                <TableHead className="text-right">95% CI</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {iv.coefficients?.map((c, i) => (
                                                <TableRow key={i} className={c.term === endogenousCol ? 'bg-primary/5 font-semibold' : ''}>
                                                    <TableCell>{c.term}</TableCell>
                                                    <TableCell className="text-right font-mono">{c.estimate?.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{c.std_error?.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{c.t_value?.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono">{c.p_value?.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">[{c.ci_lower?.toFixed(2)}, {c.ci_upper?.toFixed(2)}]</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                            
                            <Card>
                                <CardHeader><CardTitle>First Stage Results</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Instrument</TableHead>
                                                <TableHead className="text-right">Coefficient</TableHead>
                                                <TableHead className="text-right">t-value</TableHead>
                                                <TableHead className="text-right">p-value</TableHead>
                                                <TableHead>Significant</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fs.instrument_coefficients?.map((c, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-medium">{c.instrument}</TableCell>
                                                    <TableCell className="text-right font-mono">{c.coefficient?.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{c.t_value?.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono">{c.p_value?.toFixed(4)}</TableCell>
                                                    <TableCell>{c.significant ? <Badge className="bg-primary">Yes</Badge> : <Badge variant="destructive">No</Badge>}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                                        {[
                                            {label: 'F-statistic', value: fs.f_statistic?.toFixed(2), status: !fs.weak_instrument},
                                            {label: 'Critical Value', value: '10', status: true},
                                            {label: 'Weak Instrument', value: fs.weak_instrument ? 'Yes' : 'No', status: !fs.weak_instrument}
                                        ].map((item, i) => (
                                            <div key={i} className={`p-3 rounded-lg ${item.status ? 'bg-primary/5' : 'bg-rose-50 dark:bg-rose-950/20'}`}>
                                                <p className="text-xs text-muted-foreground">{item.label}</p>
                                                <p className={`font-semibold ${item.status ? 'text-primary' : 'text-rose-600'}`}>{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card>
                                <CardHeader><CardTitle>Diagnostic Tests</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {Object.entries(results.diagnostics).map(([key, test]) => (
                                            <div key={key} className="p-4 bg-muted/50 rounded-lg">
                                                <h4 className="font-semibold text-sm capitalize mb-2">{key.replace(/_/g, ' ')}</h4>
                                                <p className="text-sm text-muted-foreground">{test.message}</p>
                                                {test.p_value !== undefined && <p className="text-xs text-muted-foreground mt-1">p-value: {test.p_value?.toFixed(4)}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                    );
                })()}

                {isLoading && <Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Running 2SLS estimation...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>}
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

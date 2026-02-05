'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, CheckCircle2, AlertTriangle, HelpCircle, Settings, FileSearch, Download, Activity, Info, TrendingUp, GitBranch, FileSpreadsheet, ImageIcon, Lightbulb, Target, BookOpen, Database, Settings2, Shield, FileText, BarChart3, ChevronRight, ChevronLeft, Sparkles, Check, ArrowRight, ChevronDown, FileCode, FileType, Code, Copy } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../../ui/label';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Badge } from '../../ui/badge';
import { CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';


const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-577472426399.us-central1.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/mediation_analysis.py?alt=media";

// Statistical terms glossary for Mediation Analysis
const mediationTermDefinitions: Record<string, string> = {
    "Mediation Analysis": "A statistical method to test whether a variable (M) explains the relationship between an independent variable (X) and dependent variable (Y). Tests 'how' or 'why' X affects Y.",
    "Mediator (M)": "The intervening variable that transmits the effect of X to Y. If X affects M, and M affects Y, then M mediates the X-Y relationship.",
    "Independent Variable (X)": "The predictor or causal variable in the mediation model. X is hypothesized to affect both M and Y.",
    "Dependent Variable (Y)": "The outcome variable in the mediation model. Y is affected by both X (directly) and M.",
    "Direct Effect (c')": "The effect of X on Y while controlling for M. Represents how much of the X-Y relationship remains after accounting for mediation.",
    "Indirect Effect (a×b)": "The effect of X on Y that operates through M. Calculated as the product of path a (X→M) and path b (M→Y).",
    "Total Effect (c)": "The overall effect of X on Y, combining direct and indirect effects. c = c' + (a×b).",
    "Path a": "The regression coefficient for the effect of X on M. Significant path a indicates X influences the mediator.",
    "Path b": "The regression coefficient for the effect of M on Y, controlling for X. Significant path b indicates M influences the outcome.",
    "Path c": "The regression coefficient for the total effect of X on Y (without M in the model).",
    "Path c'": "The regression coefficient for the direct effect of X on Y (with M controlled). Also called c-prime.",
    "Full Mediation": "When the entire effect of X on Y goes through M. The direct effect (c') is not significant, but the indirect effect is.",
    "Partial Mediation": "When part of the X-Y effect goes through M, but a significant direct effect remains. Both c' and indirect effect are significant.",
    "No Mediation": "When M does not transmit the effect of X to Y. The indirect effect is not significant.",
    "Baron & Kenny Method": "The traditional four-step approach to testing mediation: (1) X→Y significant, (2) X→M significant, (3) M→Y significant controlling for X, (4) X→Y reduced when M is controlled.",
    "Sobel Test": "A statistical test for the significance of the indirect effect. Uses the standard errors of paths a and b. z = ab / √(b²sa² + a²sb²).",
    "Bootstrap Method": "A resampling technique for testing indirect effects. More accurate than Sobel test as it doesn't assume normal distribution of the indirect effect.",
    "Confidence Interval (Bootstrap)": "The range within which the true indirect effect likely falls. If CI excludes zero, the indirect effect is significant.",
    "Standard Error (SE)": "A measure of the variability in the coefficient estimate. Smaller SE indicates more precise estimation.",
    "Standardized Coefficient (β)": "Coefficient expressed in standard deviation units. Allows comparison of effect sizes across different variables.",
    "t-statistic": "The coefficient divided by its standard error. Used to test if the coefficient is significantly different from zero.",
    "p-value": "Probability of observing the result if there were no true effect. p < .05 typically indicates statistical significance.",
    "Effect Size": "The magnitude of the indirect effect relative to the total effect. Larger effect sizes indicate stronger mediation.",
    "Suppression Effect": "When including M increases (rather than decreases) the X→Y relationship. Can occur when a and b have opposite signs."
};

interface MediationResult {
    baron_kenny: {
        path_a: any;
        path_b: any;
        path_c: any;
        path_c_prime: any;
        indirect_effect: number;
        sobel_test: any;
    };
    bootstrap?: {
        mean_effect: number;
        se: number;
        ci_lower: number;
        ci_upper: number;
        n_bootstrap: number;
        significant: boolean;
    };
    mediation_type: string;
    interpretation: string;
}

interface AnalysisResponse {
    results: MediationResult;
    plot: string;
    interpretations?: {
        overall_analysis: string;
        path_insights: string[];
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

const StatisticalSummaryCards = ({ results }: { results: MediationResult }) => {
    const bk = results.baron_kenny;
    const boot = results.bootstrap;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Mediation Type</p>
                            {results.mediation_type === "Full Mediation" ? 
                                <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                                results.mediation_type === "Partial Mediation" ?
                                <AlertTriangle className="h-4 w-4 text-yellow-600" /> :
                                <Info className="h-4 w-4 text-gray-600" />
                            }
                        </div>
                        <p className="text-xl font-semibold">{results.mediation_type}</p>
                        <p className="text-xs text-muted-foreground">
                            {results.mediation_type === "Full Mediation" ? 'Complete indirect effect' :
                             results.mediation_type === "Partial Mediation" ? 'Both direct & indirect' :
                             'No significant mediation'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Indirect Effect</p>
                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">{bk.indirect_effect.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">a × b pathway</p>
                    </div>
                </CardContent>
            </Card>

            {boot && (
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-muted-foreground">95% CI</p>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className={`text-lg font-semibold font-mono ${boot.significant ? 'text-green-600' : 'text-gray-600'}`}>
                                [{boot.ci_lower.toFixed(3)}, {boot.ci_upper.toFixed(3)}]
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {boot.significant ? 'Does not include 0' : 'Includes 0'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Direct Effect</p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">{bk.path_c_prime.coef.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">
                            c&apos; pathway (p = {bk.path_c_prime.p_value < 0.001 ? '<.001' : bk.path_c_prime.p_value.toFixed(3)})
                        </p>
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
        link.download = 'mediation_analysis.py';
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
                        Python Code - Mediation Analysis
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
                        Mediation Analysis Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical terms used in mediation analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(mediationTermDefinitions).map(([term, definition]) => (
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

const generateMediationInterpretations = (results: MediationResult) => {
    const insights: string[] = [];
    const bk = results.baron_kenny;
    const boot = results.bootstrap;
    
    let overall = '';
    if (results.mediation_type === "Full Mediation") {
        overall = '<strong>Full mediation detected.</strong> The relationship between the independent variable and dependent variable is completely explained by the mediator.';
    } else if (results.mediation_type === "Partial Mediation") {
        overall = '<strong>Partial mediation detected.</strong> The mediator explains part of the relationship, but a significant direct effect remains.';
    } else {
        overall = '<strong>No significant mediation detected.</strong> The indirect effect through the mediator is not statistically significant.';
    }
    
    insights.push(`<strong>Path a (X → M):</strong> β = ${bk.path_a.coef.toFixed(3)}, p ${bk.path_a.p_value < 0.001 ? '< .001' : `= ${bk.path_a.p_value.toFixed(3)}`}. The independent variable ${bk.path_a.p_value < 0.05 ? 'significantly predicts' : 'does not significantly predict'} the mediator.`);
    insights.push(`<strong>Path b (M → Y):</strong> β = ${bk.path_b.coef.toFixed(3)}, p ${bk.path_b.p_value < 0.001 ? '< .001' : `= ${bk.path_b.p_value.toFixed(3)}`}. The mediator ${bk.path_b.p_value < 0.05 ? 'significantly predicts' : 'does not significantly predict'} the dependent variable.`);
    insights.push(`<strong>Path c' (X → Y direct):</strong> β = ${bk.path_c_prime.coef.toFixed(3)}, p ${bk.path_c_prime.p_value < 0.001 ? '< .001' : `= ${bk.path_c_prime.p_value.toFixed(3)}`}. The direct effect is ${bk.path_c_prime.p_value < 0.05 ? 'significant' : 'not significant'}.`);
    insights.push(`<strong>Path c (Total effect):</strong> β = ${bk.path_c.coef.toFixed(3)}, p ${bk.path_c.p_value < 0.001 ? '< .001' : `= ${bk.path_c.p_value.toFixed(3)}`}. The total effect is ${bk.path_c.p_value < 0.05 ? 'significant' : 'not significant'}.`);
    
    if (boot) {
        insights.push(`<strong>Bootstrap Analysis:</strong> Indirect effect = ${boot.mean_effect.toFixed(3)}, 95% CI [${boot.ci_lower.toFixed(3)}, ${boot.ci_upper.toFixed(3)}]. ${boot.significant ? 'CI does not include zero — significant mediation.' : 'CI includes zero — no significant mediation.'}`);
    }
    
    let recommendations = '';
    if (results.mediation_type === "Full Mediation") {
        recommendations = 'Interventions should target the mediator. Consider testing alternative models with multiple mediators and replicating findings.';
    } else if (results.mediation_type === "Partial Mediation") {
        recommendations = 'Consider identifying additional mediators. Both direct and indirect effects should be reported and interpreted.';
    } else {
        recommendations = 'Reconsider the theoretical model. Test alternative mediators or consider moderation instead of mediation.';
    }
    
    return { overall_analysis: overall, path_insights: insights, recommendations };
};


const MediationAnalysisGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Mediation Analysis Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Mediation */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                What is Mediation Analysis?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Mediation analysis tests whether the effect of X on Y operates <strong>through an intermediate 
                variable M</strong>. It answers "how" or "why" X affects Y, not just "whether" it does.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>The model:</strong><br/>
                  <span className="font-mono text-xs">
                    X → M → Y (indirect path through mediator)<br/>
                    X → Y (direct path)
                  </span><br/>
                  <span className="text-muted-foreground text-xs">
                    Total Effect = Direct Effect + Indirect Effect
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* When to Use */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                When Should You Use Mediation?
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Use when:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• You want to understand <strong>HOW</strong> X affects Y</li>
                    <li>• You have a theoretical <strong>causal chain</strong>: X → M → Y</li>
                    <li>• You want to identify <strong>intervention points</strong></li>
                    <li>• You're testing a <strong>mechanism</strong> or <strong>process</strong></li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    Requirements:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• <strong>Theoretical basis</strong> for why M should mediate</li>
                    <li>• <strong>Temporal ordering:</strong> X before M before Y (ideally)</li>
                    <li>• <strong>Sample size:</strong> 100+ recommended, 30 minimum</li>
                    <li>• All three variables must be <strong>continuous</strong></li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Understanding the Paths */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Understanding the Paths
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Path a (X → M)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Does X affect the mediator? This is the first link in the chain.
                    <br/><strong>Significant:</strong> X successfully influences M
                    <br/><strong>Not significant:</strong> The chain is broken at the start
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Path b (M → Y)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Does M affect Y, controlling for X? This is the second link.
                    <br/><strong>Significant:</strong> M influences Y beyond X's effect
                    <br/><strong>Not significant:</strong> M doesn't transmit effect to Y
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Path c (Total Effect)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The overall relationship between X and Y (ignoring M).
                    <br/>This is what you'd find in a simple X → Y regression.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Path c' (Direct Effect)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    X's effect on Y <strong>after accounting for M</strong>.
                    <br/><strong>Full mediation:</strong> c' becomes non-significant (all effect goes through M)
                    <br/><strong>Partial mediation:</strong> c' remains significant (some effect is direct)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Indirect Effect (a × b)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The effect of X on Y that travels <strong>through M</strong>.
                    <br/>Calculated as: (path a) × (path b)
                    <br/>This is the key quantity for mediation!
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Types of Mediation */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Types of Mediation
              </h3>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary mb-1">Full Mediation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Indirect effect significant</li>
                    <li>• Direct effect (c') NOT significant</li>
                    <li>• M explains ALL of X → Y</li>
                    <li>• Strongest evidence for mechanism</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Partial Mediation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Indirect effect significant</li>
                    <li>• Direct effect (c') ALSO significant</li>
                    <li>• M explains PART of X → Y</li>
                    <li>• Other pathways may exist</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">No Mediation</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Indirect effect NOT significant</li>
                    <li>• M doesn't explain X → Y</li>
                    <li>• Consider other mediators</li>
                    <li>• Or X → Y may be direct</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Bootstrap vs Sobel */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Testing Methods: Bootstrap vs Sobel
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/50 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Bootstrap (Recommended)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Resamples your data thousands of times to estimate the indirect effect.
                    <br/><strong>Advantage:</strong> Doesn't assume normal distribution of a×b
                    <br/><strong>Output:</strong> 95% confidence interval
                    <br/><strong>Rule:</strong> If CI excludes zero → significant mediation
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Sobel Test (Traditional)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uses a formula to calculate SE of the indirect effect.
                    <br/><strong>Limitation:</strong> Assumes normal distribution (often violated)
                    <br/><strong>Output:</strong> z-statistic and p-value
                    <br/><strong>Note:</strong> Less accurate than bootstrap, especially for small samples
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Tip:</strong> This tool uses bootstrap by default (1,000 resamples). 
                    Trust the bootstrap CI over the Sobel test, especially with smaller samples.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Interpreting Results */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Sigma className="w-4 h-4" />
                Interpreting Your Results
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Check These in Order:</p>
                  <ol className="text-xs text-muted-foreground mt-1 space-y-1 list-decimal ml-4">
                    <li><strong>Path a significant?</strong> X must affect M</li>
                    <li><strong>Path b significant?</strong> M must affect Y (controlling X)</li>
                    <li><strong>Bootstrap CI excludes zero?</strong> Key test for indirect effect</li>
                    <li><strong>Path c' significant?</strong> Determines full vs partial</li>
                  </ol>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Effect Size</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Proportion mediated:</strong> Indirect / Total = (a×b) / c
                    <br/>• 0-30%: Small mediation effect
                    <br/>• 30-60%: Moderate mediation
                    <br/>• 60%+: Large mediation effect
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
                    <li>• Have theoretical justification for M</li>
                    <li>• Ensure sufficient sample size (100+)</li>
                    <li>• Check variables are continuous</li>
                    <li>• Consider temporal ordering</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Interpreting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use bootstrap CI, not just Sobel</li>
                    <li>• Report all paths (a, b, c, c')</li>
                    <li>• Note the mediation type</li>
                    <li>• Calculate proportion mediated</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Causal Claims</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Mediation suggests mechanism</li>
                    <li>• But correlation ≠ causation</li>
                    <li>• Consider unmeasured confounders</li>
                    <li>• Experimental design is best</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Reporting</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Report indirect effect + 95% CI</li>
                    <li>• Include all path coefficients</li>
                    <li>• State bootstrap iterations</li>
                    <li>• Note mediation type found</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Mediation analysis helps identify potential 
                mechanisms, but it cannot prove causation from correlational data. The temporal and causal 
                ordering (X before M before Y) is assumed, not tested. Consider the theoretical plausibility 
                of your model and potential confounding variables.
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
                            <GitBranch className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Mediation Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Test whether a variable mediates the relationship between X and Y
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Direct Effect</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">X → Y pathway (c&apos;)</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <GitBranch className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Indirect Effect</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">X → M → Y pathway (a×b)</p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Total Effect</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Combined influence (c)</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileSearch className="w-5 h-5" />
                            When to Use This Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Mediation analysis tests whether the effect of X on Y operates through a mediator (M).
                            This helps understand &quot;how&quot; or &quot;why&quot; a relationship exists.
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
                                        <span><strong>X:</strong> Independent variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>M:</strong> Mediator variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Y:</strong> Dependent variable</span>
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
                                        <span><strong>Full:</strong> Only indirect significant</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Partial:</strong> Both effects significant</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Bootstrap:</strong> More robust</span>
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
                            <GitBranch className="mr-2 h-5 w-5" />
                            Load Example Data
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

interface MediationAnalysisPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    restoredState?: any;
}

export default function MediationAnalysisPage({ data, numericHeaders, onLoadExample, restoredState }: MediationAnalysisPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    const [xVar, setXVar] = useState<string>('');
    const [mVar, setMVar] = useState<string>('');
    const [yVar, setYVar] = useState<string>('');
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Modal states
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false); 


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
            passed: data.length >= 30,
            detail: `n = ${data.length} observations (${data.length >= 100 ? 'Good' : data.length >= 30 ? 'Adequate' : 'Very small - results may be unreliable'})`
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
            link.download = `Mediation_Report_${new Date().toISOString().split('T')[0]}.png`;
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
        
        const bk = analysisResult.results.baron_kenny;
        const boot = analysisResult.results.bootstrap;
        
        let csvContent = "MEDIATION ANALYSIS RESULTS\n";
        csvContent += `X: ${xVar}, M: ${mVar}, Y: ${yVar}\n`;
        csvContent += `Mediation Type: ${analysisResult.results.mediation_type}\n\n`;
        
        const pathData = [
            { path: 'a (X → M)', coefficient: bk.path_a.coef, se: bk.path_a.se, p_value: bk.path_a.p_value },
            { path: 'b (M → Y)', coefficient: bk.path_b.coef, se: bk.path_b.se, p_value: bk.path_b.p_value },
            { path: "c' (Direct)", coefficient: bk.path_c_prime.coef, se: bk.path_c_prime.se, p_value: bk.path_c_prime.p_value },
            { path: 'c (Total)', coefficient: bk.path_c.coef, se: bk.path_c.se, p_value: bk.path_c.p_value },
            { path: 'Indirect (a×b)', coefficient: bk.indirect_effect, se: boot ? boot.se : bk.sobel_test.se, p_value: boot ? null : bk.sobel_test.p_value }
        ];
        csvContent += "PATH COEFFICIENTS\n" + Papa.unparse(pathData) + "\n\n";
        
        if (boot) {
            csvContent += "BOOTSTRAP RESULTS\n";
            csvContent += Papa.unparse([{ mean: boot.mean_effect, se: boot.se, ci_lower: boot.ci_lower, ci_upper: boot.ci_upper, significant: boot.significant }]) + "\n";
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Mediation_Results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, xVar, mVar, yVar, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!xVar || !mVar || !yVar) {
            toast({ variant: 'destructive', title: 'Please select all variables.' });
            return;
        }

        if (xVar === mVar || xVar === yVar || mVar === yVar) {
            toast({ variant: 'destructive', title: 'X, M, and Y must be different variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/mediation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, xVar, mVar, yVar, nBootstrap: 1000, standardize: true })
            });

            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            result.interpretations = generateMediationInterpretations(result.results);
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: 'Analysis Complete', description: 'Mediation analysis results are ready.' });
        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, xVar, mVar, yVar, toast]);


    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult?.results) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/mediation-docx', {
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
            link.download = `Mediation_Report_${new Date().toISOString().split('T')[0]}.docx`;
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
    const bk = results?.baron_kenny;

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
            <MediationAnalysisGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Mediation Analysis</h1>
                    <p className="text-muted-foreground mt-1">Test how X affects Y through mediator M</p>
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
                                    <CardDescription>Choose X (independent), M (mediator), and Y (dependent)</CardDescription>
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
                                    <Label className="text-sm font-medium">Mediator (M)</Label>
                                    <Select value={mVar} onValueChange={setMVar}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select M" /></SelectTrigger>
                                        <SelectContent>
                                            {numericHeaders.filter(h => h !== xVar).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">The mechanism variable</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Dependent Variable (Y)</Label>
                                    <Select value={yVar} onValueChange={setYVar}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select Y" /></SelectTrigger>
                                        <SelectContent>
                                            {numericHeaders.filter(h => h !== xVar && h !== mVar).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
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
                                    <CardDescription>Review your mediation model configuration</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-4">
                                <h4 className="font-medium text-sm">Mediation Model</h4>
                                <div className="flex items-center justify-center gap-2 py-4">
                                    <Badge variant="outline" className="text-base px-4 py-2">{xVar || 'X'}</Badge>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                    <Badge variant="outline" className="text-base px-4 py-2">{mVar || 'M'}</Badge>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                    <Badge variant="outline" className="text-base px-4 py-2">{yVar || 'Y'}</Badge>
                                </div>
                                <div className="text-center text-sm text-muted-foreground">
                                    Also testing direct path: {xVar || 'X'} → {yVar || 'Y'}
                                </div>
                            </div>

                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Analysis Parameters</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">Method:</strong> Baron & Kenny + Bootstrap</p>
                                    <p>• <strong className="text-foreground">Bootstrap samples:</strong> 1,000 iterations</p>
                                    <p>• <strong className="text-foreground">Standardization:</strong> Enabled</p>
                                    <p>• <strong className="text-foreground">Confidence level:</strong> 95%</p>
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
                                <GitBranch className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                    Mediation analysis will test whether {mVar || 'M'} mediates the relationship between {xVar || 'X'} and {yVar || 'Y'}.
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
                {currentStep === 4 && results && bk && (() => {
                    const isFull = results.mediation_type === "Full Mediation";
                    const isPartial = results.mediation_type === "Partial Mediation";
                    const hasMediation = isFull || isPartial;
                    const boot = results.bootstrap;

                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Result Summary</CardTitle>
                                        <CardDescription>Key findings from your mediation analysis</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-xl p-6 space-y-4 border ${hasMediation ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Sparkles className={`w-5 h-5 ${hasMediation ? 'text-primary' : 'text-rose-600'}`} />
                                        Key Findings
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${hasMediation ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                            <p className="text-sm">
                                                {isFull 
                                                    ? <><strong>{mVar}</strong> fully explains how <strong>{xVar}</strong> affects <strong>{yVar}</strong>.</>
                                                    : isPartial 
                                                    ? <><strong>{mVar}</strong> partially explains how <strong>{xVar}</strong> affects <strong>{yVar}</strong>.</>
                                                    : <><strong>{mVar}</strong> does not appear to mediate the relationship between <strong>{xVar}</strong> and <strong>{yVar}</strong>.</>}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${hasMediation ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                            <p className="text-sm">
                                                The indirect effect (through {mVar}) is <strong>{bk.indirect_effect.toFixed(3)}</strong>.
                                                {boot && <> Bootstrap 95% CI: [{boot.ci_lower.toFixed(3)}, {boot.ci_upper.toFixed(3)}].</>}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className={`font-bold ${hasMediation ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                            <p className="text-sm">
                                                {boot?.significant 
                                                    ? "We're confident this finding is real — not just random chance."
                                                    : "This finding may be due to random variation in your data."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${hasMediation ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {hasMediation ? (
                                            <CheckCircle2 className="w-6 h-6 text-primary" />
                                        ) : (
                                            <AlertTriangle className="w-6 h-6 text-rose-600" />
                                        )}
                                        <div>
                                            <p className="font-semibold">{isFull ? "Clear Pathway Found" : isPartial ? "Partial Pathway Found" : "No Clear Pathway"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {isFull 
                                                    ? `To change ${yVar}, focus on ${mVar}. That's the key link in the chain.` 
                                                    : isPartial 
                                                    ? `${mVar} is one way ${xVar} affects ${yVar}, but there may be other ways too.` 
                                                    : `${mVar} isn't how ${xVar} affects ${yVar}. Consider testing other potential pathways.`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <StatisticalSummaryCards results={results} />

                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Confidence:</span>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span key={star} className={`text-lg ${
                                            (isFull && star <= 5) || 
                                            (isPartial && star <= 4) || 
                                            (boot?.significant && star <= 3) ||
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
                {currentStep === 5 && results && bk && (() => {
                    const isFull = results.mediation_type === "Full Mediation";
                    const isPartial = results.mediation_type === "Partial Mediation";
                    const hasMediation = isFull || isPartial;
                    const boot = results.bootstrap;

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
                                                We tested whether <strong className="text-foreground">{mVar}</strong> is a &quot;middle step&quot; between 
                                                <strong className="text-foreground"> {xVar}</strong> and <strong className="text-foreground">{yVar}</strong>. 
                                                Think of it like: Does A cause B, which then causes C?
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Does {xVar} Affect {mVar}?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {bk.path_a.p_value < 0.05 
                                                    ? <>Yes! When {xVar} changes, {mVar} changes too. This first link is <strong className="text-foreground">confirmed</strong>.</>
                                                    : <>Not really. {xVar} doesn&apos;t seem to affect {mVar} much. This breaks the chain.</>}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Does {mVar} Affect {yVar}?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {bk.path_b.p_value < 0.05 
                                                    ? <>Yes! When {mVar} changes, {yVar} changes. The second link is also <strong className="text-foreground">confirmed</strong>.</>
                                                    : <>Not clearly. {mVar} doesn&apos;t strongly affect {yVar}. This also weakens the pathway.</>}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Is There Still a Direct Connection?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {bk.path_c_prime.p_value < 0.05 
                                                    ? <>{xVar} still directly affects {yVar} even when we account for {mVar}. So {mVar} explains <strong className="text-foreground">part</strong> of the effect, but not all.</>
                                                    : <>Once we account for {mVar}, there&apos;s no direct link left. {mVar} explains the <strong className="text-foreground">entire</strong> connection!</>}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-xl p-5 border ${hasMediation ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        {hasMediation ? (
                                            <><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line: The Pathway Exists</>
                                        ) : (
                                            <><AlertTriangle className="w-5 h-5 text-rose-600" /> Bottom Line: No Clear Pathway</>
                                        )}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {isFull 
                                            ? `${mVar} is THE way ${xVar} affects ${yVar}. If you want to change ${yVar}, focus your efforts on ${mVar}.` 
                                            : isPartial 
                                            ? `${mVar} is ONE way ${xVar} affects ${yVar}, but there are other paths too. Still worth targeting ${mVar} for impact.` 
                                            : `${mVar} isn't the link between ${xVar} and ${yVar}. Consider what else might connect them.`}
                                    </p>
                                </div>

                                <div className="bg-muted/20 rounded-xl p-4">
                                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4" />Pathway Types
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">Full</p>
                                            <p className="text-muted-foreground">All through M</p>
                                        </div>
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">Partial</p>
                                            <p className="text-muted-foreground">Some through M</p>
                                        </div>
                                        <div className="text-center p-2 bg-background rounded-lg">
                                            <p className="font-medium">None</p>
                                            <p className="text-muted-foreground">Not through M</p>
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
                {currentStep === 6 && results && bk && (
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
                                <h2 className="text-2xl font-bold">Mediation Analysis Report</h2>
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

                                    {analysisResult?.interpretations?.path_insights && (
                                        <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                <h3 className="font-semibold">Key Insights</h3>
                                            </div>
                                            <ul className="space-y-2">
                                                {analysisResult.interpretations.path_insights.map((insight, idx) => (
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

                            {/* Path Coefficients Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Path Coefficients</CardTitle>
                                    <CardDescription>Standardized coefficients for all pathways</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Path</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">β</TableHead>
                                                <TableHead className="text-right">SE</TableHead>
                                                <TableHead className="text-right">t/z</TableHead>
                                                <TableHead className="text-right">p-value</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-semibold">a</TableCell>
                                                <TableCell className="text-muted-foreground">X → M</TableCell>
                                                <TableCell className="font-mono text-right">{bk.path_a.coef.toFixed(3)}</TableCell>
                                                <TableCell className="font-mono text-right">{bk.path_a.se.toFixed(3)}</TableCell>
                                                <TableCell className="font-mono text-right">{bk.path_a.t_stat.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={bk.path_a.p_value < 0.05 ? 'default' : 'secondary'}>
                                                        {bk.path_a.p_value < 0.001 ? '<.001' : bk.path_a.p_value.toFixed(3)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-semibold">b</TableCell>
                                                <TableCell className="text-muted-foreground">M → Y</TableCell>
                                                <TableCell className="font-mono text-right">{bk.path_b.coef.toFixed(3)}</TableCell>
                                                <TableCell className="font-mono text-right">{bk.path_b.se.toFixed(3)}</TableCell>
                                                <TableCell className="font-mono text-right">{bk.path_b.t_stat.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={bk.path_b.p_value < 0.05 ? 'default' : 'secondary'}>
                                                        {bk.path_b.p_value < 0.001 ? '<.001' : bk.path_b.p_value.toFixed(3)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-semibold">c&apos;</TableCell>
                                                <TableCell className="text-muted-foreground">X → Y (direct)</TableCell>
                                                <TableCell className="font-mono text-right">{bk.path_c_prime.coef.toFixed(3)}</TableCell>
                                                <TableCell className="font-mono text-right">{bk.path_c_prime.se.toFixed(3)}</TableCell>
                                                <TableCell className="font-mono text-right">{bk.path_c_prime.t_stat.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={bk.path_c_prime.p_value < 0.05 ? 'default' : 'secondary'}>
                                                        {bk.path_c_prime.p_value < 0.001 ? '<.001' : bk.path_c_prime.p_value.toFixed(3)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-semibold">c</TableCell>
                                                <TableCell className="text-muted-foreground">X → Y (total)</TableCell>
                                                <TableCell className="font-mono text-right">{bk.path_c.coef.toFixed(3)}</TableCell>
                                                <TableCell className="font-mono text-right">{bk.path_c.se.toFixed(3)}</TableCell>
                                                <TableCell className="font-mono text-right">{bk.path_c.t_stat.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={bk.path_c.p_value < 0.05 ? 'default' : 'secondary'}>
                                                        {bk.path_c.p_value < 0.001 ? '<.001' : bk.path_c.p_value.toFixed(3)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow className="bg-muted/50">
                                                <TableCell className="font-semibold">a×b</TableCell>
                                                <TableCell className="text-muted-foreground">Indirect effect</TableCell>
                                                <TableCell className="font-mono text-right">{bk.indirect_effect.toFixed(3)}</TableCell>
                                                <TableCell className="font-mono text-right">
                                                    {results.bootstrap ? results.bootstrap.se.toFixed(3) : bk.sobel_test.se.toFixed(3)}
                                                </TableCell>
                                                <TableCell className="font-mono text-right">
                                                    {results.bootstrap ? '—' : bk.sobel_test.z_stat.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={results.bootstrap?.significant || bk.sobel_test.p_value < 0.05 ? 'default' : 'secondary'}>
                                                        {results.bootstrap ? 'Bootstrap' : (bk.sobel_test.p_value < 0.001 ? '<.001' : bk.sobel_test.p_value.toFixed(3))}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Visualization */}
                            {analysisResult?.plot && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Visualization</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Image src={analysisResult.plot} alt="Mediation Analysis Plot" width={1400} height={1000} className="w-full rounded-md border" />
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
            />

            {/* Glossary Modal */}
            <GlossaryModal 
                isOpen={glossaryModalOpen}
                onClose={() => setGlossaryModalOpen(false)}
            />
        </div>
    );
}


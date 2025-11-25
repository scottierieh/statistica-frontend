'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Shield, TrendingUp, Target, BarChart, Percent, HelpCircle, MoveRight, Settings, FileSearch, Layers, CheckCircle, AlertTriangle, BookOpen, ShieldCheck, Activity, TrendingDown, Lightbulb } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';

interface RegressionResult {
    params: number[];
    bse: number[];
    r_squared?: number;
    pseudo_r_squared?: number;
    summary?: { [key: string]: string | number };
}

interface FullAnalysisResponse {
    results: {
        ols: RegressionResult;
        rlm: RegressionResult;
    };
    plot: string;
    interpretation?: string;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results, mNorm }: { results: { ols: RegressionResult; rlm: RegressionResult }, mNorm: string }) => {
    const olsR2 = results.ols.r_squared || 0;
    const rlmPseudoR2 = results.rlm.pseudo_r_squared || 0;
    const coeffDiff = Math.abs(results.ols.params[1] - results.rlm.params[1]);
    
    const getR2Interpretation = (r2: number) => {
        if (r2 >= 0.75) return 'Excellent fit';
        if (r2 >= 0.50) return 'Good fit';
        if (r2 >= 0.25) return 'Moderate fit';
        return 'Weak fit';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* OLS R² Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                OLS R²
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {olsR2.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getR2Interpretation(olsR2)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* RLM Pseudo R² Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                RLM Pseudo R²
                            </p>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {rlmPseudoR2.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Robust fit
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Coefficient Difference Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Coeff. Difference
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {coeffDiff.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {coeffDiff > 0.1 ? 'Outliers present' : 'Minimal impact'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Method Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Robust Method
                            </p>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-xl font-semibold">
                            {mNorm}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            M-estimator
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component
const RobustRegressionOverview = ({ xCol, yCol, mNorm, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (xCol && yCol) {
            overview.push(`Predicting ${yCol} from ${xCol}`);
            overview.push(`Robust method: ${mNorm} M-estimator`);
        } else {
            overview.push('Select X and Y variables');
        }

        // Sample size
        if (data.length < 30) {
            overview.push(`Sample size: ${data.length} (⚠ Small - robust methods less effective)`);
        } else if (data.length < 100) {
            overview.push(`Sample size: ${data.length} (Moderate)`);
        } else {
            overview.push(`Sample size: ${data.length} (Good for robust estimation)`);
        }
        
        // Model info
        overview.push('Comparison: OLS vs. Robust Linear Model (RLM)');
        overview.push('RLM downweights outliers and influential points');
        overview.push('More reliable when data contains anomalies');
        overview.push('Best for: Data with outliers or heavy-tailed distributions');

        return overview;
    }, [xCol, yCol, mNorm, data]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const regressionExample = exampleDatasets.find(ex => ex.id === 'regression-suite');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Robust Regression</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Regression analysis resistant to outliers and influential observations
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <ShieldCheck className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Outlier Resistance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Downweights extreme values automatically
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">M-Estimators</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Multiple robust methods for different data patterns
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingDown className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">OLS Comparison</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Shows how outliers affect standard regression
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
                            Use robust regression when your data may contain outliers, measurement errors, or 
                            follows a heavy-tailed distribution. It&apos;s ideal when OLS assumptions are violated, 
                            particularly when residuals are not normally distributed or when influential points 
                            could skew results. Essential for reliable analysis when data quality is uncertain.
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
                                        <span><strong>Variables:</strong> One X and one Y (numeric)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> Minimum 30 observations</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>M-estimator:</strong> HuberT for most cases</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Data:</strong> May contain outliers</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>OLS vs RLM:</strong> Large differences = outliers</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Pseudo R²:</strong> Robust fit measure</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Visual:</strong> Compare regression lines</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Weights:</strong> Lower = potential outlier</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {regressionExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(regressionExample)} size="lg">
                                <Shield className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface RobustRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RobustRegressionPage({ data, numericHeaders, onLoadExample }: RobustRegressionPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [xCol, setXCol] = useState<string | undefined>();
    const [yCol, setYCol] = useState<string | undefined>();
    
    const [mNorm, setMNorm] = useState('HuberT');
    const [missing, setMissing] = useState('drop');
    const [scaleEst, setScaleEst] = useState('mad');
    const [initMethod, setInitMethod] = useState('ls');

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    
    useEffect(() => {
        if(canRun) {
            setXCol(numericHeaders[0]);
            setYCol(numericHeaders[1]);
        }
        setView(canRun ? 'main' : 'intro');
    }, [canRun, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!xCol || !yCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both X and Y columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/robust-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    x_col: xCol, 
                    y_col: yCol,
                    M: mNorm,
                    missing,
                    scale_est: scaleEst,
                    init: initMethod,
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, xCol, yCol, mNorm, missing, scaleEst, initMethod, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;
    const coeffDiff = results ? Math.abs(results.ols.params[1] - results.rlm.params[1]) : 0;
    const hasOutlierImpact = coeffDiff > 0.1;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Robust Regression Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>
                        Compare Ordinary Least Squares (OLS) with Robust Linear Model (RLM) to assess outlier influence
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Independent Variable (X)</Label>
                            <Select value={xCol} onValueChange={setXCol}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Dependent Variable (Y)</Label>
                            <Select value={yCol} onValueChange={setYCol}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.filter(h => h !== xCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <Card className="bg-muted/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Advanced Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <Label className="text-xs">Robust Norm (M)</Label>
                                    <Select value={mNorm} onValueChange={setMNorm}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HuberT">HuberT</SelectItem>
                                            <SelectItem value="TukeyBiweight">TukeyBiweight</SelectItem>
                                            <SelectItem value="RamsayE">RamsayE</SelectItem>
                                            <SelectItem value="AndrewWave">AndrewWave</SelectItem>
                                            <SelectItem value="Hampel">Hampel</SelectItem>
                                            <SelectItem value="LeastSquares">LeastSquares</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Missing Values</Label>
                                    <Select value={missing} onValueChange={setMissing}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="drop">Drop</SelectItem>
                                            <SelectItem value="none">None</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Scale Estimation</Label>
                                    <Select value={scaleEst} onValueChange={setScaleEst}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mad">MAD</SelectItem>
                                            <SelectItem value="HuberScale">HuberScale</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Initial Values</Label>
                                    <Select value={initMethod} onValueChange={setInitMethod}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ls">Least Squares</SelectItem>
                                            <SelectItem value="median">Median</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Overview Component */}
                    <RobustRegressionOverview 
                        xCol={xCol}
                        yCol={yCol}
                        mNorm={mNorm}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !xCol || !yCol}>
                        {isLoading ? 
                            <><Loader2 className="mr-2 animate-spin"/> Running...</> : 
                            <><Sigma className="mr-2"/>Run Analysis</>
                        }
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Running Robust Regression Analysis...</p>
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
            )}

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} mNorm={mNorm} />
                    
                    {/* Detailed Analysis - Ridge/Lasso 스타일 적용 */}
                    {analysisResult.interpretation && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-primary" />
                                    Detailed Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {(() => {
                                    const interpretation = analysisResult.interpretation;
                                    const sections: { title: string; content: string[]; icon: any }[] = [];
                                    
                                    const lines = interpretation.split('\n').filter(l => l.trim());
                                    let currentSection: typeof sections[0] | null = null;
                                    
                                    lines.forEach((line) => {
                                        const trimmed = line.trim();
                                        if (!trimmed) return;
                                        
                                        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                                            const title = trimmed.replace(/\*\*/g, '').trim();
                                            
                                            let icon = Shield;
                                            if (title.includes('Overall')) icon = Shield;
                                            else if (title.includes('Statistical') || title.includes('Insights')) icon = Lightbulb;
                                            else if (title.includes('Recommendations')) icon = BookOpen;
                                            
                                            currentSection = { title, content: [], icon };
                                            sections.push(currentSection);
                                        } else if (currentSection) {
                                            currentSection.content.push(trimmed);
                                        }
                                    });
                                    
                                    return sections.map((section, idx) => {
                                        const Icon = section.icon;
                                        
                                        let gradientClass = '';
                                        let borderClass = '';
                                        let iconBgClass = '';
                                        let iconColorClass = '';
                                        let bulletColorClass = '';
                                        
                                        // Color based on icon type
                                        if (Icon === Shield) {
                                            // First section - Primary color
                                            gradientClass = 'bg-gradient-to-br from-primary/5 to-primary/10';
                                            borderClass = 'border-primary/40';
                                            iconBgClass = 'bg-primary/10';
                                            iconColorClass = 'text-primary';
                                            bulletColorClass = 'text-primary';
                                        } else if (Icon === Lightbulb) {
                                            // Second section - Blue color
                                            gradientClass = 'bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10';
                                            borderClass = 'border-blue-300 dark:border-blue-700';
                                            iconBgClass = 'bg-blue-500/10';
                                            iconColorClass = 'text-blue-600 dark:text-blue-400';
                                            bulletColorClass = 'text-blue-600 dark:text-blue-400';
                                        } else {
                                            // Third section - Amber/Orange color
                                            gradientClass = 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10';
                                            borderClass = 'border-amber-300 dark:border-amber-700';
                                            iconBgClass = 'bg-amber-500/10';
                                            iconColorClass = 'text-amber-600 dark:text-amber-400';
                                            bulletColorClass = 'text-amber-600 dark:text-amber-400';
                                        }
                                        
                                        return (
                                            <div key={idx} className={`${gradientClass} rounded-lg p-6 border ${borderClass}`}>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className={`p-2 ${iconBgClass} rounded-md`}>
                                                        <Icon className={`h-4 w-4 ${iconColorClass}`} />
                                                    </div>
                                                    <h3 className="font-semibold text-base">{section.title}</h3>
                                                </div>
                                                <div className="space-y-3">
                                                    {section.content.map((text, textIdx) => {
                                                        if (text.startsWith('→')) {
                                                            return (
                                                                <div key={textIdx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                                    <span className={`${bulletColorClass} font-bold mt-0.5`}>→</span>
                                                                    <div dangerouslySetInnerHTML={{ __html: text.substring(1).trim().replace(/\*\*/g, '') }} />
                                                                </div>
                                                            );
                                                        } else if (text.startsWith('•') || text.startsWith('-')) {
                                                            return (
                                                                <div key={textIdx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                                    <span className={`${bulletColorClass} font-bold mt-0.5`}>•</span>
                                                                    <div dangerouslySetInnerHTML={{ __html: text.substring(1).trim().replace(/\*\*/g, '') }} />
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <p key={textIdx} className="text-sm text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: text.replace(/\*\*/g, '') }} />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </CardContent>
                        </Card>
                    )}
                    
                    {/* Comparison Results and Visualization */}
                    <Card>
                        <CardHeader>
                            <CardTitle>OLS vs Robust Regression Comparison</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                {/* Coefficient Comparison */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold">Coefficient Comparison</h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Parameter</TableHead>
                                                <TableHead className="text-right">OLS</TableHead>
                                                <TableHead className="text-right">RLM</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium">Intercept</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {results.ols.params[0].toFixed(4)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {results.rlm.params[0].toFixed(4)}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">{xCol} (Slope)</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {results.ols.params[1].toFixed(4)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {results.rlm.params[1].toFixed(4)}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow className="border-t-2">
                                                <TableCell className="font-semibold">Difference</TableCell>
                                                <TableCell className="text-right font-mono font-semibold">
                                                    {Math.abs(results.ols.params[0] - results.rlm.params[0]).toFixed(4)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-semibold">
                                                    {coeffDiff.toFixed(4)}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            
                            <Image 
                                src={analysisResult.plot} 
                                alt="Robust Regression vs OLS" 
                                width={800} 
                                height={600} 
                                className="w-full rounded-md border"
                            />
                        </CardContent>
                    </Card>

                    {/* Detailed Results Tables */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>OLS Results</CardTitle>
                                <CardDescription>Standard Ordinary Least Squares regression</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Parameter</TableHead>
                                            <TableHead className="text-right">Coefficient</TableHead>
                                            <TableHead className="text-right">Std. Error</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Intercept</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {results.ols.params[0].toFixed(4)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {results.ols.bse[0].toFixed(4)}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">{xCol}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {results.ols.params[1].toFixed(4)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {results.ols.bse[1].toFixed(4)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                                <div className="mt-4 p-3 bg-muted/50 rounded-md">
                                    <p className="text-sm">
                                        <strong>R-squared:</strong> {results.ols.r_squared?.toFixed(4)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>RLM Results ({mNorm})</CardTitle>
                                <CardDescription>Robust Linear Model with {mNorm} M-estimator</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Parameter</TableHead>
                                            <TableHead className="text-right">Coefficient</TableHead>
                                            <TableHead className="text-right">Std. Error</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Intercept</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {results.rlm.params[0].toFixed(4)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {results.rlm.bse[0].toFixed(4)}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">{xCol}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {results.rlm.params[1].toFixed(4)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {results.rlm.bse[1].toFixed(4)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                                <div className="mt-4 p-3 bg-muted/50 rounded-md">
                                    <p className="text-sm">
                                        <strong>Pseudo R-squared:</strong> {results.rlm.pseudo_r_squared?.toFixed(4)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RLM Summary if available */}
                    {results.rlm.summary && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Robust Model Summary Statistics</CardTitle>
                                <CardDescription>Additional diagnostics for the robust linear model</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(results.rlm.summary).map(([key, value]) => (
                                        <div key={key} className="p-3 bg-muted/50 rounded-md">
                                            <p className="text-xs font-medium text-muted-foreground">{key}</p>
                                            <p className="font-semibold text-sm">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {!isLoading && !analysisResult && (
                <div className="text-center text-muted-foreground py-10">
                    <Shield className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and click &apos;Run Analysis&apos; to see results.</p>
                </div>
            )}
        </div>
    );
}
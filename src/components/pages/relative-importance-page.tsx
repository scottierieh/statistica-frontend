'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Percent, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp, Target, BarChart, Layers, CheckCircle, AlertTriangle, BookOpen, PieChart, Activity, Sparkles, Lightbulb } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface ImportanceResult {
    predictor: string;
    standardized_beta: number;
    semi_partial_r2: number;
    relative_weight_pct: number;
    rank: number;
}

interface FullAnalysisResponse {
    results: ImportanceResult[];
    interpretation?: string;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: ImportanceResult[] }) => {
    const topPredictor = results[0];
    const totalVarianceExplained = results.reduce((sum, r) => sum + r.relative_weight_pct, 0);
    const avgImportance = totalVarianceExplained / results.length;
    const importanceSpread = Math.max(...results.map(r => r.relative_weight_pct)) - Math.min(...results.map(r => r.relative_weight_pct));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Top Predictor Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Top Predictor
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-xl font-semibold truncate" title={topPredictor.predictor}>
                            {topPredictor.predictor}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {topPredictor.relative_weight_pct.toFixed(1)}% contribution
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Total Variance Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Total R²
                            </p>
                            <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {totalVarianceExplained.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Variance explained
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Average Importance Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Avg. Importance
                            </p>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {avgImportance.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Per predictor
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Importance Spread Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Spread
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {importanceSpread.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {importanceSpread > 30 ? 'Clear hierarchy' : 'Similar importance'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component
const RelativeImportanceOverview = ({ dependentVar, independentVars, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (dependentVar && independentVars.length > 0) {
            overview.push(`Analyzing ${dependentVar} with ${independentVars.length} predictor${independentVars.length > 1 ? 's' : ''}`);
            
            if (independentVars.length < 2) {
                overview.push('⚠ Need at least 2 predictors for relative importance analysis');
            }
        } else {
            overview.push('Select dependent variable and predictors');
        }

        // Sample size considerations
        if (data.length < 50) {
            overview.push(`Sample size: ${data.length} (⚠ Small - results may be unstable)`);
        } else if (data.length < 100) {
            overview.push(`Sample size: ${data.length} (Adequate)`);
        } else {
            overview.push(`Sample size: ${data.length} (Good)`);
        }

        // Observations per predictor
        if (independentVars.length > 0) {
            const ratio = Math.floor(data.length / independentVars.length);
            if (ratio < 10) {
                overview.push(`⚠ Only ${ratio} observations per predictor (aim for 10+)`);
            } else if (ratio < 20) {
                overview.push(`${ratio} observations per predictor (adequate)`);
            } else {
                overview.push(`${ratio} observations per predictor (excellent)`);
            }
        }
        
        // Method info
        overview.push('Method: Relative weight analysis (Johnson, 2000)');
        overview.push('Handles multicollinearity by decomposing R²');
        overview.push('Provides unbiased importance estimates');
        overview.push('⚠ Requires predictors to not be perfectly correlated');
        overview.push('Sum of relative weights equals total R²');

        return overview;
    }, [dependentVar, independentVars, data]);

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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'regression-suite');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Percent className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Relative Importance Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Determine the true contribution of each predictor, even with multicollinearity
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <PieChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Decompose R²</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Split total variance into predictor contributions
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Handle Correlation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Accurate importance despite multicollinearity
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Sparkles className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Clear Rankings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify your most influential predictors
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
                            Use relative importance analysis when you need to understand which predictors matter most 
                            in your regression model, especially when predictors are correlated. It&apos;s essential for 
                            feature selection, model interpretation, and understanding predictor influence when standard 
                            regression coefficients are misleading due to multicollinearity.
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
                                        <span><strong>Dependent:</strong> One numeric outcome variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Predictors:</strong> At least 2 numeric variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> 10+ per predictor</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Correlation:</strong> Not perfectly correlated</span>
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
                                        <span><strong>Relative Weight %:</strong> Main importance metric</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sum to R²:</strong> Weights total to model R²</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Ranking:</strong> Compare predictor importance</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Beta vs RW:</strong> Shows multicollinearity effect</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <Percent className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface RelativeImportancePageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RelativeImportancePage({ data, numericHeaders, onLoadExample }: RelativeImportancePageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVar, setDependentVar] = useState<string | undefined>(numericHeaders[numericHeaders.length - 1]);
    const [independentVars, setIndependentVars] = useState<string[]>(numericHeaders.slice(0, numericHeaders.length - 1));
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const availableIVs = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    useEffect(() => {
        const defaultTarget = numericHeaders.length > 1 ? numericHeaders[numericHeaders.length - 1] : numericHeaders[0];
        setDependentVar(defaultTarget);
        setIndependentVars(numericHeaders.filter(h => h !== defaultTarget));
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleIVChange = (header: string, checked: boolean) => {
        setIndependentVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || independentVars.length < 1) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a dependent variable and at least one independent variable.' });
            return;
        }

        if (independentVars.length < 2) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Relative importance analysis requires at least 2 independent variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/relative-importance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependent_var: dependentVar, independent_vars: independentVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            
        } catch (error: any) {
            const errorMsg = error.message || 'An unexpected error occurred';
            
            // Check for multicollinearity error
            if (errorMsg.includes('multicollinearity') || errorMsg.includes('correlated')) {
                toast({ 
                    variant: 'destructive', 
                    title: 'Multicollinearity Detected', 
                    description: 'Perfect or near-perfect multicollinearity detected among predictors. Please remove one of the highly correlated variables and try again.',
                    duration: 10000
                });
            } else {
                toast({ 
                    variant: 'destructive', 
                    title: 'Analysis Error', 
                    description: errorMsg,
                    duration: 8000
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, independentVars, toast]);

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;
    const totalVariance = results ? results.reduce((sum, r) => sum + r.relative_weight_pct, 0) : 0;
    const hasGoodFit = totalVariance >= 50;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                         <CardTitle className="font-headline">Relative Importance Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>
                        Decompose R² to determine each predictor&apos;s relative contribution to model fit
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Dependent Variable (Y)</Label>
                            <Select value={dependentVar} onValueChange={setDependentVar}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Independent Variables (X)</Label>
                            <ScrollArea className="h-32 border rounded-md p-4">
                                <div className="grid grid-cols-2 gap-2">
                                    {availableIVs.map(h => (
                                        <div key={h} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`iv-${h}`} 
                                                checked={independentVars.includes(h)} 
                                                onCheckedChange={(c) => handleIVChange(h, c as boolean)} 
                                            />
                                            <Label htmlFor={`iv-${h}`} className="text-sm">{h}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    
                    {/* Overview Component */}
                    <RelativeImportanceOverview 
                        dependentVar={dependentVar}
                        independentVars={independentVars}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !dependentVar || independentVars.length < 2}>
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
                        <p className="text-muted-foreground">Running Relative Importance Analysis...</p>
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
            )}

            {results && (
                <div className="space-y-4">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />
                    
                    {/* Detailed Analysis - Ridge/Lasso/Robust 스타일 적용 */}
                    {analysisResult.interpretation && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <Percent className="h-5 w-5 text-primary" />
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
                                            
                                            let icon = Percent;
                                            if (title.includes('Overall')) icon = Percent;
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
                                        if (Icon === Percent) {
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
                    
                    {/* Results Visualization and Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Relative Importance Results</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                {/* Importance Ranking */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold">Importance Ranking</h4>
                                    {results.map((row, idx) => (
                                        <div key={row.predictor} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium">
                                                    {idx + 1}. {row.predictor}
                                                </span>
                                                <Badge variant={idx === 0 ? 'default' : 'secondary'}>
                                                    {row.relative_weight_pct.toFixed(1)}%
                                                </Badge>
                                            </div>
                                            <Progress value={row.relative_weight_pct} className="h-2" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Detailed Table */}
                            <div>
                                <h4 className="text-sm font-semibold mb-3">Detailed Metrics</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Predictor</TableHead>
                                            <TableHead className="text-right">Std. Beta</TableHead>
                                            <TableHead className="text-right">Semi-Partial R²</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map(row => (
                                            <TableRow key={row.predictor}>
                                                <TableCell className="font-medium">{row.predictor}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">
                                                    {row.standardized_beta.toFixed(3)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm">
                                                    {row.semi_partial_r2.toFixed(3)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="mt-3 p-3 bg-muted/50 rounded-md">
                                    <p className="text-xs text-muted-foreground">
                                        <strong>Total R²:</strong> {totalVariance.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Complete Results Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Complete Analysis Table</CardTitle>
                            <CardDescription>
                                All importance metrics for each predictor
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Predictor</TableHead>
                                        <TableHead className="text-right">Standardized Beta</TableHead>
                                        <TableHead className="text-right">Semi-Partial R²</TableHead>
                                        <TableHead className="text-right">Relative Weight (%)</TableHead>
                                        <TableHead className="text-right">Rank</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map(row => (
                                        <TableRow key={row.predictor}>
                                            <TableCell className="font-medium">{row.predictor}</TableCell>
                                            <TableCell className="text-right font-mono">{row.standardized_beta.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{row.semi_partial_r2.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono font-semibold">
                                                {row.relative_weight_pct.toFixed(1)}%
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={row.rank === 1 ? 'default' : 'outline'}>
                                                    #{row.rank}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <p className="text-sm text-muted-foreground">
                                Relative weights sum to total R² and provide unbiased importance estimates even with correlated predictors. 
                                Higher percentages indicate greater contribution to model prediction.
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {!isLoading && !analysisResult && (
                <div className="text-center text-muted-foreground py-10">
                    <Percent className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and click &apos;Run Analysis&apos; to see results.</p>
                </div>
            )}
        </div>
    );
}
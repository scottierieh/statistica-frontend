'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Component, Bot, CheckCircle2, AlertTriangle, HelpCircle, MoveRight, Settings, FileSearch, BarChart, CheckCircle, Shrink, TrendingDown, Zap, Percent, Hash, Layers, Target, Lightbulb, BookOpen } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';

interface PcaResults {
    eigenvalues: number[];
    explained_variance_ratio: number[];
    cumulative_variance_ratio: number[];
    loadings: number[][];
    n_components: number;
    variables: string[];
    interpretation: string;
}

interface FullPcaResponse {
    results: PcaResults;
    plot: string;
}

// Statistical Summary Cards Component for PCA
const StatisticalSummaryCards = ({ results }: { results: PcaResults }) => {
    const kaiserComponents = results.eigenvalues.filter(ev => ev > 1).length;
    const totalVariance = results.cumulative_variance_ratio[results.n_components - 1] * 100;
    const firstComponentVariance = results.explained_variance_ratio[0] * 100;
    const strongLoadings = results.loadings.flat().filter(l => Math.abs(l) > 0.4).length;
    const totalLoadings = results.loadings.flat().length;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Variance Explained Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Variance
                            </p>
                            <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {totalVariance.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            By {results.n_components} component{results.n_components !== 1 ? 's' : ''}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Kaiser Criterion Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Kaiser Criterion
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {kaiserComponents}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Components with eigenvalue &gt; 1
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* First Component Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                PC1 Variance
                            </p>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {firstComponentVariance.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            First component explains
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Strong Loadings Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Strong Loadings
                            </p>
                            <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {strongLoadings}/{totalLoadings}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {((strongLoadings/totalLoadings)*100).toFixed(0)}% &gt; 0.4
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const PcaOverview = ({ selectedItems, nComponents, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (selectedItems.length === 0) {
            overview.push('Select at least 2 variables for PCA');
        } else if (selectedItems.length < 2) {
            overview.push(`⚠ Only ${selectedItems.length} variable selected (minimum 2 required)`);
        } else if (selectedItems.length === 2) {
            overview.push(`Analyzing ${selectedItems.length} variables (minimum for PCA)`);
        } else if (selectedItems.length <= 5) {
            overview.push(`Analyzing ${selectedItems.length} variables (small set)`);
        } else if (selectedItems.length <= 10) {
            overview.push(`Analyzing ${selectedItems.length} variables (moderate set)`);
        } else {
            overview.push(`Analyzing ${selectedItems.length} variables (large set - good for dimension reduction)`);
        }

        // Sample size assessment
        const n = data.length;
        const ratio = n / selectedItems.length;
        if (n < 30) {
            overview.push(`Sample size: ${n} observations (⚠ Very small - results may be unstable)`);
        } else if (n < 100) {
            overview.push(`Sample size: ${n} observations (Small - interpret with caution)`);
        } else if (n < 300) {
            overview.push(`Sample size: ${n} observations (Adequate)`);
        } else {
            overview.push(`Sample size: ${n} observations (Good)`);
        }
        
        if (selectedItems.length >= 2) {
            if (ratio < 3) {
                overview.push(`⚠ Subject-to-variable ratio: ${ratio.toFixed(1)}:1 (Very low)`);
            } else if (ratio < 5) {
                overview.push(`Subject-to-variable ratio: ${ratio.toFixed(1)}:1 (Low)`);
            } else if (ratio < 10) {
                overview.push(`Subject-to-variable ratio: ${ratio.toFixed(1)}:1 (Adequate)`);
            } else {
                overview.push(`Subject-to-variable ratio: ${ratio.toFixed(1)}:1 (Good)`);
            }
        }

        // Component extraction info
        if (nComponents) {
            overview.push(`Will extract ${nComponents} component${nComponents !== 1 ? 's' : ''}`);
        } else {
            overview.push('Components: Auto-determine based on eigenvalues > 1');
        }

        // Method info
        overview.push('Method: Principal Component Analysis');
        overview.push('Components are orthogonal (uncorrelated)');
        overview.push('Maximizes variance explained by each component');
        
        // Data standardization note
        overview.push('Variables will be standardized (mean=0, std=1)');

        return overview;
    }, [selectedItems, nComponents, data]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Analysis Overview</CardTitle>
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
    const pcaExample = exampleDatasets.find(d => d.id === 'cfa-psych-constructs');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Component className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Principal Component Analysis (PCA)</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Transform complex data into simpler, meaningful components
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Shrink className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Dimension Reduction</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Reduce many variables to fewer components without losing information
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingDown className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Remove Redundancy</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Eliminate multicollinearity by creating uncorrelated components
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Zap className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Data Visualization</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Enable 2D/3D visualization of high-dimensional data
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileSearch className="w-5 h-5" />
                            When to Use PCA
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use PCA when you have many correlated variables and want to reduce complexity while 
                            retaining most information. It&apos;s perfect for exploratory data analysis, preprocessing 
                            for machine learning, dealing with multicollinearity, and visualizing high-dimensional data.
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
                                        <span><strong>Variables:</strong> At least 2 numeric variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> 5-10 observations per variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Correlation:</strong> Variables should be correlated</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Scale:</strong> Variables auto-standardized</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <BarChart className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Eigenvalues &gt; 1:</strong> Components to retain (Kaiser rule)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Scree plot:</strong> Look for the &quot;elbow&quot; point</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Loadings &gt; 0.4:</strong> Strong variable-component association</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Cumulative %:</strong> Aim for 70-90% variance explained</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {pcaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(pcaExample)} size="lg">
                                <Component className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface PcaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function PcaPage({ data, numericHeaders, onLoadExample }: PcaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [nComponents, setNComponents] = useState<number | null>(null);
    const [analysisResult, setAnalysisResult] = useState<FullPcaResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setSelectedItems(numericHeaders);
        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [data, numericHeaders]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const handleItemSelectionChange = (header: string, checked: boolean) => {
        setSelectedItems(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 2) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least two variables for PCA.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/pca', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    variables: selectedItems,
                    nComponents: nComponents ? Number(nComponents) : null
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('PCA error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, nComponents, toast]);
    
    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">PCA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select variables and optionally specify the number of components.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Variables for PCA</Label>
                        <ScrollArea className="h-40 border rounded-md p-4 mt-2">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {numericHeaders.map(header => (
                              <div key={header} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`pca-${header}`}
                                  checked={selectedItems.includes(header)}
                                  onCheckedChange={(checked) => handleItemSelectionChange(header, checked as boolean)}
                                />
                                <label htmlFor={`pca-${header}`} className="text-sm font-medium leading-none">{header}</label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                    </div>
                    
                    <div>
                        <Label htmlFor="nComponents">Number of Components (Optional)</Label>
                        <Input 
                            id="nComponents"
                            type="number" 
                            placeholder="Auto (based on eigenvalues)"
                            value={nComponents ?? ''}
                            onChange={e => setNComponents(e.target.value ? parseInt(e.target.value) : null)}
                            min="1"
                            max={selectedItems.length || 1}
                            className="mt-2"
                        />
                    </div>
                    
                    {/* Analysis Overview */}
                    <PcaOverview 
                        selectedItems={selectedItems}
                        nComponents={nComponents}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || selectedItems.length < 2}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Running Principal Component Analysis...</p>
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResult && results && (
                 <div className="space-y-4">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Detailed Analysis - GLM Style with 3 colored sections (위치: 그래프 위) */}
                    {results.interpretation && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <Component className="h-5 w-5 text-primary" />
                                    Detailed Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {(() => {
                                    const interpretation = results.interpretation;
                                    const sections: { title: string; content: string[]; icon: any }[] = [];
                                    
                                    const lines = interpretation.split('\n').filter(l => l.trim());
                                    let currentSection: typeof sections[0] | null = null;
                                    
                                    lines.forEach((line) => {
                                        const trimmed = line.trim();
                                        if (!trimmed) return;
                                        
                                        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                                            const title = trimmed.replace(/\*\*/g, '').trim();
                                            
                                            let icon = Component;
                                            if (title.includes('Overall')) icon = Component;
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
                                        
                                        // Color based on icon type (matching GLM exactly)
                                        if (Icon === Component) {
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

                    {/* Visual Summary - 그래프 */}
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Visual Summary</CardTitle>
                                <CardDescription>Scree plot to determine the number of components to retain and a loadings plot to interpret them.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="PCA Plots" width={1400} height={600} className="1/2 mx-auto rounded-sm border" />
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Eigenvalues &amp; Explained Variance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Component</TableHead>
                                            <TableHead className="text-right">Eigenvalue</TableHead>
                                            <TableHead className="text-right">% of Variance</TableHead>
                                            <TableHead className="text-right">Cumulative %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.eigenvalues.map((ev, i) => (
                                             <TableRow key={i} className={ev > 1 ? 'font-semibold' : ''}>
                                                <TableCell>PC{i + 1}</TableCell>
                                                <TableCell className="font-mono text-right">{ev.toFixed(3)}</TableCell>
                                                <TableCell className="font-mono text-right">{(results.explained_variance_ratio[i] * 100).toFixed(2)}%</TableCell>
                                                <TableCell className="font-mono text-right">{(results.cumulative_variance_ratio[i] * 100).toFixed(2)}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Component Loadings</CardTitle>
                                <CardDescription>Shows how original variables contribute to each principal component.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-72">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Variable</TableHead>
                                            {Array.from({ length: results.n_components }).map((_, i) => (
                                                <TableHead key={i} className="text-right">PC{i + 1}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.variables.map((variable, varIndex) => (
                                            <TableRow key={variable}>
                                                <TableCell className="font-medium">{variable}</TableCell>
                                                {results.loadings[varIndex].map((loading, compIndex) => (
                                                    <TableCell 
                                                        key={compIndex} 
                                                        className={`text-right font-mono ${Math.abs(loading) >= 0.4 ? 'font-bold text-primary' : ''}`}
                                                    >
                                                        {loading.toFixed(3)}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Component className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select variables and click &apos;Run Analysis&apos; to see the results.</p>
                </div>
            )}
        </div>
    );
}


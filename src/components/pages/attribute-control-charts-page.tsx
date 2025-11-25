'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, HelpCircle, CheckSquare, Target, Activity, AlertTriangle, CheckCircle, BarChart3, TrendingUp, Layers, BookOpen, FileBarChart, Zap, Info, Download, Bot, CheckCircle2 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Papa from 'papaparse';

interface ControlChartResult {
    chart_type: string;
    center_line: number;
    ucl: number | number[];
    lcl: number | number[];
    points: number[];
    violations: number[];
}

interface FullAnalysisResponse {
    results: ControlChartResult;
    interpretations?: {
        overall_analysis: string;
        test_insights: string[];
        recommendations: string[];
    };
}

interface AttributeControlChartsPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

// Run Tests Analysis
const performRunTests = (points: number[], centerLine: number) => {
    const tests = {
        test1: { name: 'Point beyond 3σ', violations: [] as number[] },
        test2: { name: '9 consecutive points on same side', violations: [] as number[] },
        test3: { name: '6 consecutive increasing/decreasing', violations: [] as number[] },
        test4: { name: '14 consecutive alternating', violations: [] as number[] },
    };

    // Test 2: 9 consecutive points on same side of center line
    for (let i = 0; i <= points.length - 9; i++) {
        const slice = points.slice(i, i + 9);
        const allAbove = slice.every(p => p > centerLine);
        const allBelow = slice.every(p => p < centerLine);
        if (allAbove || allBelow) {
            tests.test2.violations.push(i + 8);
        }
    }

    // Test 3: 6 consecutive points steadily increasing or decreasing
    for (let i = 0; i <= points.length - 6; i++) {
        const slice = points.slice(i, i + 6);
        const increasing = slice.every((val, idx) => idx === 0 || val > slice[idx - 1]);
        const decreasing = slice.every((val, idx) => idx === 0 || val < slice[idx - 1]);
        if (increasing || decreasing) {
            tests.test3.violations.push(i + 5);
        }
    }

    // Test 4: 14 consecutive points alternating up and down
    for (let i = 0; i <= points.length - 14; i++) {
        const slice = points.slice(i, i + 14);
        let alternating = true;
        for (let j = 2; j < slice.length; j++) {
            const diff1 = slice[j - 1] - slice[j - 2];
            const diff2 = slice[j] - slice[j - 1];
            if ((diff1 > 0 && diff2 > 0) || (diff1 < 0 && diff2 < 0)) {
                alternating = false;
                break;
            }
        }
        if (alternating) {
            tests.test4.violations.push(i + 13);
        }
    }

    return tests;
};

// Process Capability Calculation
const calculateProcessCapability = (points: number[], ucl: number | number[], lcl: number | number[]) => {
    const mean = points.reduce((sum, p) => sum + p, 0) / points.length;
    const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / (points.length - 1);
    const stdDev = Math.sqrt(variance);
    
    const uclVal = typeof ucl === 'number' ? ucl : Math.max(...ucl);
    const lclVal = typeof lcl === 'number' ? lcl : Math.min(...lcl);
    
    // Calculate sigma level (approximate)
    const sigmaLevel = (uclVal - lclVal) / (6 * stdDev);
    
    return {
        mean,
        stdDev,
        sigmaLevel: sigmaLevel.toFixed(2),
    };
};

// Generate interpretations
const generateAttributeChartInterpretations = (results: ControlChartResult, runTests: any, capability: any) => {
    const insights: string[] = [];
    const outOfControl = results.violations.length > 0;
    const hasPatterns = runTests && Object.values(runTests).some((test: any) => test.violations.length > 0);
    
    // Overall analysis
    let overall = '';
    if (outOfControl) {
        overall = `<strong>Process is out of statistical control.</strong> ${results.violations.length} point(s) exceed the control limits (samples: ${results.violations.map(v => v + 1).join(', ')}), indicating special cause variation. When points fall outside the ±3σ limits, it signals that something unusual has affected the process beyond normal random variation. Immediate investigation is required to identify and eliminate these special causes before the process can be considered stable and predictable.`;
    } else if (hasPatterns) {
        overall = `<strong>Process shows non-random patterns.</strong> While all points are within control limits, Western Electric rules have detected systematic patterns that suggest special causes may be present. These patterns (runs, trends, or cycles) indicate the process is not behaving randomly, which could signal gradual process shifts, tool wear, or other systematic issues that need attention.`;
    } else {
        overall = `<strong>Process is in statistical control.</strong> All ${results.points.length} data points fall within the control limits and no systematic patterns are detected. This indicates only common cause variation is present—the natural, random variation inherent in the process. The process is stable and predictable, which is a prerequisite for process improvement initiatives.`;
    }
    
    // Chart type insight
    const chartDescriptions: { [key: string]: string } = {
        'p-Chart': 'monitors the proportion of defective items with variable sample sizes. It divides defective items by total inspected to track quality rates over time.',
        'np-Chart': 'tracks the number of defective items with a constant sample size. Simpler than p-chart but requires consistent batch sizes.',
        'c-Chart': 'counts defects per unit with a constant inspection area. Best for situations where each unit can have multiple defects (scratches, errors, etc.).',
        'u-Chart': 'measures defects per unit with variable inspection areas. Normalizes defect counts when inspection area or opportunity for defects varies.',
    };
    insights.push(`<strong>Chart Type:</strong> ${results.chart_type} ${chartDescriptions[results.chart_type] || ''}`);
    
    // Control limits insight
    const uclVal = typeof results.ucl === 'number' ? results.ucl : Math.max(...results.ucl);
    const lclVal = typeof results.lcl === 'number' ? results.lcl : Math.min(...results.lcl);
    const isVariable = Array.isArray(results.ucl);
    insights.push(`<strong>Control Limits:</strong> Center Line = ${results.center_line.toFixed(4)}, UCL = ${uclVal.toFixed(4)}, LCL = ${lclVal.toFixed(4)}. ${isVariable ? 'Variable limits adjust for changing sample sizes.' : 'Constant limits based on fixed sample size.'} These ±3σ limits contain 99.73% of points if only common causes are present.`);
    
    // Violations insight
    if (outOfControl) {
        insights.push(`<strong>Special Causes Detected:</strong> ${results.violations.length} point(s) outside control limits indicate special cause variation. Common special causes include: equipment malfunction, operator error, material defects, measurement error, or process setting changes. Each violation requires root cause investigation.`);
    }
    
    // Pattern insights
    if (hasPatterns) {
        const patternTypes = Object.entries(runTests)
            .filter(([_, test]: [string, any]) => test.violations.length > 0)
            .map(([_, test]: [string, any]) => test.name);
        insights.push(`<strong>Non-Random Patterns:</strong> Detected patterns include: ${patternTypes.join(', ')}. Even within control limits, these patterns suggest non-random behavior that may indicate: gradual process drift, tool wear, shift-to-shift variation, cyclic patterns, or other systematic issues.`);
    }
    
    // Process capability insight
    if (capability) {
        insights.push(`<strong>Process Statistics:</strong> Mean = ${capability.mean.toFixed(4)}, Standard Deviation = ${capability.stdDev.toFixed(4)}, Sigma Level ≈ ${capability.sigmaLevel}σ. ${parseFloat(capability.sigmaLevel) >= 6 ? 'Excellent process capability (Six Sigma level).' : parseFloat(capability.sigmaLevel) >= 4 ? 'Good process capability, typical for many industries.' : 'Process capability could be improved through variation reduction.'}`);
    }
    
    // Sample count insight
    insights.push(`<strong>Sample Size:</strong> Analysis based on ${results.points.length} samples. For reliable control limits, minimum 20-25 samples recommended. ${results.points.length < 20 ? '⚠ Limited data—limits may not be stable. Collect more samples before making decisions.' : 'Adequate sample size for stable control limit estimation.'}`);
    
    // Recommendations
    let recommendations: string[] = [];
    if (outOfControl) {
        recommendations = [
            '<strong>IMMEDIATE: Stop and investigate</strong> all out-of-control points to identify special causes',
            '<strong>Root cause analysis:</strong> Use tools like 5 Whys, fishbone diagrams, or Pareto charts to find why violations occurred',
            '<strong>Implement corrective actions:</strong> Eliminate special causes (fix equipment, retrain operators, improve materials)',
            '<strong>Verify effectiveness:</strong> Continue monitoring after corrections to confirm process returns to control',
            '<strong>Do not adjust process:</strong> If only common causes present. Over-adjustment creates more variation',
            '<strong>Document findings:</strong> Record special causes and solutions to prevent recurrence and train team'
        ];
    } else if (hasPatterns) {
        recommendations = [
            '<strong>Investigate patterns systematically:</strong> Even without control limit violations, patterns require attention',
            '<strong>Check for systematic factors:</strong> Look for time-based patterns (shifts, days, batches) or sequential issues',
            '<strong>Review process inputs:</strong> Verify materials, tools, settings haven\'t changed gradually over time',
            '<strong>Consider stratification:</strong> Analyze data by shift, operator, machine to identify systematic differences',
            '<strong>Monitor closely:</strong> Patterns often precede out-of-control situations—early detection prevents defects',
            '<strong>Recalculate limits if needed:</strong> If process fundamentally improved, establish new baseline'
        ];
    } else {
        recommendations = [
            '<strong>Maintain current control:</strong> Process is stable—focus on continuous monitoring',
            '<strong>Reduce common cause variation:</strong> Use DOE, process optimization, or Six Sigma methods to improve',
            '<strong>Standardize operations:</strong> Document and train on current best practices to sustain performance',
            '<strong>Regular review:</strong> Update control charts with new data, recalculate limits if process changes',
            '<strong>Prevent tampering:</strong> Don\'t over-adjust a stable process—this increases variation',
            '<strong>Benchmark and improve:</strong> Compare to industry standards, set improvement goals for defect reduction'
        ];
    }
    
    return {
        overall_analysis: overall,
        test_insights: insights,
        recommendations: recommendations
    };
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results, capability }: { results: ControlChartResult, capability: any }) => {
    const outOfControl = results.violations.length > 0;
    const uclVal = typeof results.ucl === 'number' ? results.ucl : Math.max(...results.ucl);
    const lclVal = typeof results.lcl === 'number' ? results.lcl : Math.min(...results.lcl);
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Control Status Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Control Status
                            </p>
                            {outOfControl ? 
                                <AlertTriangle className="h-4 w-4 text-red-600" /> :
                                <CheckCircle2 className="h-4 w-4 text-black-600" />
                            }
                        </div>
                        <p className={`text-2xl font-semibold ${outOfControl ? 'text-red-600' : 'text-black-600'}`}>
                            {outOfControl ? 'Out of Control' : 'In Control'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.violations.length} violation(s)
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Center Line Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Center Line
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {results.center_line.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Process Average
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Control Limits Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Control Limits
                            </p>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            ±3σ
                        </p>
                        <p className="text-xs text-muted-foreground">
                            UCL: {uclVal.toFixed(4)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Sigma Level Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Sigma Level
                            </p>
                            <Zap className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {capability?.sigmaLevel || 'N/A'}σ
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Process Capability
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview Component
const AttributeChartOverview = ({ chartType, defectsCol, sampleSizeCol, dataLength, sampleSizeConstant }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Chart type info
        const chartDescriptions: { [key: string]: string } = {
            'p': 'p-Chart: Proportion of defectives (variable sample size)',
            'np': 'np-Chart: Number of defectives (constant sample size)',
            'c': 'c-Chart: Count of defects (constant inspection area)',
            'u': 'u-Chart: Defects per unit (variable inspection area)',
        };
        overview.push(chartDescriptions[chartType] || 'Select a chart type');
        
        // Variable selection
        if (defectsCol) {
            overview.push(`Defects variable: ${defectsCol}`);
        } else {
            overview.push('Select defects column');
        }
        
        if (['p', 'np', 'u'].includes(chartType)) {
            if (sampleSizeCol) {
                overview.push(`Sample size variable: ${sampleSizeCol}`);
                if (chartType === 'np' && !sampleSizeConstant) {
                    overview.push('⚠ np-Chart requires constant sample size');
                }
            } else {
                overview.push('Select sample size column');
            }
        }
        
        // Data info
        overview.push(`Number of samples: ${dataLength}`);
        if (dataLength < 20) {
            overview.push('⚠ 20+ samples recommended for reliable limits');
        }
        
        // Usage tips
        const usageTips: { [key: string]: string } = {
            'p': 'Use for: Proportion defective with varying batch sizes',
            'np': 'Use for: Number defective with fixed batch size',
            'c': 'Use for: Defect count per fixed unit (scratches, errors)',
            'u': 'Use for: Defects per unit with varying area',
        };
        overview.push(usageTips[chartType]);
        
        overview.push('Control limits: ±3σ from process average');
        overview.push('Detects: Special cause variation and patterns');

        return overview;
    }, [chartType, defectsCol, sampleSizeCol, dataLength, sampleSizeConstant]);

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

const IntroPage = ({ onStart, onLoadExample }: { 
    onStart: () => void, 
    onLoadExample: () => void 
}) => {
    const attributeChartExample = exampleDatasets.find(d => d.id === 'attribute-chart-data');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <CheckSquare className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Attribute Control Charts</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Monitor process quality using discrete data: defect counts, proportions, and pass/fail outcomes
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">p-Chart</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Proportion of defective items with variable sample sizes
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">np-Chart</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Number of defective items with constant sample size
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">c-Chart</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Count of defects per unit with constant inspection area
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <FileBarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">u-Chart</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Defects per unit with variable inspection area
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Attribute Control Charts
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Attribute control charts are used when measuring quality characteristics that are counted rather than measured. 
                            They're ideal for pass/fail data, defect counts, or any discrete outcomes. Choose the right chart based on 
                            whether you're counting defective items or defects, and whether your sample size is constant or variable.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-primary" />
                                    Chart Selection Guide
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Defective items:</strong> p or np chart</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Number of defects:</strong> c or u chart</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Variable sample:</strong> p or u chart</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Constant sample:</strong> np or c chart</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>In control:</strong> Random variation only</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Out of control:</strong> Special causes present</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Patterns:</strong> Non-random behavior</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {attributeChartExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={onLoadExample} size="lg">
                                <CheckSquare className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default function AttributeControlChartsPage({ data, numericHeaders, onLoadExample, onGenerateReport }: AttributeControlChartsPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [chartType, setChartType] = useState<'p' | 'np' | 'c' | 'u'>('p');
    const [defectsCol, setDefectsCol] = useState<string | undefined>();
    const [sampleSizeCol, setSampleSizeCol] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [runTests, setRunTests] = useState<any>(null);
    const [capability, setCapability] = useState<any>(null);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1, [data, numericHeaders]);

    const sampleSizeConstant = useMemo(() => {
        if (!sampleSizeCol || data.length === 0) return true;
        const sizes = data.map(row => row[sampleSizeCol]).filter(v => v != null);
        return new Set(sizes).size === 1;
    }, [data, sampleSizeCol]);

    useEffect(() => {
        setDefectsCol(numericHeaders.find(h => h.toLowerCase().includes('defect')));
        setSampleSizeCol(numericHeaders.find(h => h.toLowerCase().includes('sample') || h.toLowerCase().includes('size')));
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleLoadExampleData = () => {
        const example = exampleDatasets.find(d => d.id === 'attribute-chart-data');
        if (example) {
            onLoadExample(example);
        }
    };

    const handleAnalysis = useCallback(async () => {
        if (!defectsCol || (['p', 'np', 'u'].includes(chartType) && !sampleSizeCol)) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select all required columns for the chosen chart type.' });
            return;
        }

        if (chartType === 'np' && !sampleSizeConstant) {
            toast({ variant: 'destructive', title: 'Invalid Data', description: 'np-Chart requires constant sample size.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        setRunTests(null);
        setCapability(null);

        try {
            const response = await fetch('/api/analysis/attribute-control-charts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    chart_type: chartType, 
                    defects_col: defectsCol, 
                    sample_size_col: sampleSizeCol 
                })
            });
            
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }
            
            const result = await response.json();
            
            // Perform run tests
            const tests = performRunTests(result.results.points, result.results.center_line);
            setRunTests(tests);
            
            // Calculate process capability
            const cap = calculateProcessCapability(
                result.results.points, 
                result.results.ucl, 
                result.results.lcl
            );
            setCapability(cap);
            
            // Generate interpretations
            const interpretations = generateAttributeChartInterpretations(result.results, tests, cap);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);
            
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, chartType, defectsCol, sampleSizeCol, sampleSizeConstant, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) return;
        
        const results = analysisResult.results;
        const exportData = results.points.map((point, idx) => ({
            sample: idx + 1,
            value: point,
            ucl: Array.isArray(results.ucl) ? results.ucl[idx] : results.ucl,
            lcl: Array.isArray(results.lcl) ? results.lcl[idx] : results.lcl,
            center_line: results.center_line,
            violation: results.violations.includes(idx) ? 'Yes' : 'No'
        }));
        
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${chartType}_chart_results.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        toast({ title: 'Download Started', description: 'Control chart results are being downloaded.' });
    }, [analysisResult, chartType, toast]);

    const chartData = useMemo(() => {
        if (!analysisResult) return [];
        const { points, ucl, lcl, center_line } = analysisResult.results;
        return points.map((p, i) => ({
            name: `${i + 1}`,
            value: p,
            ucl: Array.isArray(ucl) ? ucl[i] : ucl,
            lcl: Array.isArray(lcl) ? lcl[i] : lcl,
            cl: center_line,
            violation: analysisResult.results.violations.includes(i)
        }));
    }, [analysisResult]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Attribute Control Chart Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>
                        Select chart type and variables to monitor your process quality
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="chartType">Chart Type</Label>
                            <Select value={chartType} onValueChange={(v) => setChartType(v as any)}>
                                <SelectTrigger id="chartType">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="p">p-Chart (Proportion)</SelectItem>
                                    <SelectItem value="np">np-Chart (Number)</SelectItem>
                                    <SelectItem value="c">c-Chart (Defects)</SelectItem>
                                    <SelectItem value="u">u-Chart (Defects/Unit)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="defectsCol">Defects Column</Label>
                            <Select value={defectsCol} onValueChange={setDefectsCol}>
                                <SelectTrigger id="defectsCol">
                                    <SelectValue placeholder="Select defects variable..."/>
                                </SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {(chartType === 'p' || chartType === 'np' || chartType === 'u') && (
                            <div className="space-y-2">
                                <Label htmlFor="sampleSizeCol">Sample Size Column</Label>
                                <Select value={sampleSizeCol} onValueChange={setSampleSizeCol}>
                                    <SelectTrigger id="sampleSizeCol">
                                        <SelectValue placeholder="Select sample size..."/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {chartType === 'np' && sampleSizeCol && !sampleSizeConstant && (
                                    <p className="text-xs text-red-600">⚠ Sample size must be constant for np-Chart</p>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Overview Component */}
                    <AttributeChartOverview
                        chartType={chartType}
                        defectsCol={defectsCol}
                        sampleSizeCol={sampleSizeCol}
                        dataLength={data.length}
                        sampleSizeConstant={sampleSizeConstant}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {results && (
                            <>
                                {onGenerateReport && (
                                    <Button variant="ghost" onClick={() => onGenerateReport(analysisResult, null)}>
                                        <Bot className="mr-2"/>AI Report
                                    </Button>
                                )}
                                <Button variant="outline" onClick={handleDownloadResults}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Results
                                </Button>
                            </>
                        )}
                    </div>
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Sigma className="mr-2 h-4 w-4"/>
                                Run Analysis
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Generating control chart...</p>
                        <Skeleton className="h-96 w-full"/>
                    </CardContent>
                </Card>
            )}

            {analysisResult && results && capability && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} capability={capability} />

                    {/* Analysis Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                            <CardDescription>Control chart status and process assessment</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={results.violations.length > 0 ? 'destructive' : 'default'}>
                                {results.violations.length === 0 ? 
                                    <CheckCircle2 className="h-4 w-4" /> : 
                                    <AlertTriangle className="h-4 w-4" />
                                }
                                <AlertTitle>
                                    {results.violations.length === 0 ? 'Process In Statistical Control' : 'Process Out of Control'}
                                </AlertTitle>
                                <AlertDescription>
                                    {results.violations.length === 0 ? 
                                        'All points are within control limits. The process appears stable with only common cause variation.' :
                                        `${results.violations.length} point(s) exceed control limits at sample(s): ${results.violations.map(v => v + 1).join(', ')}. Investigation required.`
                                    }
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Detailed Analysis */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                Detailed Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Overall Analysis */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <BarChart3 className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Control Status Assessment</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }}
                                />
                            </div>

                            {/* Key Insights */}
                            {analysisResult.interpretations?.test_insights && analysisResult.interpretations.test_insights.length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-md">
                                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Key Insights</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {analysisResult.interpretations.test_insights.map((insight, idx) => (
                                            <li 
                                                key={idx}
                                                className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed"
                                            >
                                                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                                <div dangerouslySetInnerHTML={{ __html: insight }} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Recommendations */}
                            {analysisResult.interpretations?.recommendations && analysisResult.interpretations.recommendations.length > 0 && (
                                <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-amber-500/10 rounded-md">
                                            <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Recommendations</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {analysisResult.interpretations.recommendations.map((rec, idx) => (
                                            <li 
                                                key={idx}
                                                className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed"
                                            >
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div dangerouslySetInnerHTML={{ __html: rec }} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Main Control Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">{results.chart_type}</CardTitle>
                            <CardDescription>
                                Center Line: {results.center_line.toFixed(4)} | Control Limits: ±3σ from center
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={{}} className="h-96 w-full">
                                <ResponsiveContainer>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3"/>
                                        <XAxis 
                                            dataKey="name" 
                                            label={{ value: 'Sample Number', position: 'insideBottom', offset: -5 }}
                                        />
                                        <YAxis 
                                            domain={['dataMin - 0.01', 'dataMax + 0.01']}
                                            label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
                                        />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                        <Line 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke="hsl(var(--primary))" 
                                            strokeWidth={2} 
                                            name="Data" 
                                            dot={(props: any) => {
                                                const { cx, cy, payload } = props;
                                                return (
                                                    <circle 
                                                        cx={cx} 
                                                        cy={cy} 
                                                        r={payload.violation ? 6 : 4} 
                                                        fill={payload.violation ? "hsl(var(--destructive))" : "hsl(var(--primary))"} 
                                                        stroke="white" 
                                                        strokeWidth={2}
                                                    />
                                                );
                                            }}
                                        />
                                        <Line 
                                            type="step" 
                                            dataKey="ucl" 
                                            stroke="hsl(var(--destructive))" 
                                            strokeDasharray="5 5" 
                                            name="UCL" 
                                            dot={false}
                                        />
                                        <Line 
                                            type="step" 
                                            dataKey="lcl" 
                                            stroke="hsl(var(--destructive))" 
                                            strokeDasharray="5 5" 
                                            name="LCL" 
                                            dot={false}
                                        />
                                        <ReferenceLine 
                                            y={results.center_line} 
                                            stroke="hsl(var(--chart-2))" 
                                            label="CL" 
                                            strokeWidth={2} 
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                        <CardFooter>
                            <p className="text-xs text-muted-foreground">
                                Red dots indicate out-of-control points. Dashed lines show ±3σ control limits.
                            </p>
                        </CardFooter>
                    </Card>

                    {/* Violations Table */}
                    {results.violations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Violation Details</CardTitle>
                                <CardDescription>Points exceeding control limits</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sample #</TableHead>
                                            <TableHead className="text-right">Value</TableHead>
                                            <TableHead className="text-right">UCL</TableHead>
                                            <TableHead className="text-right">LCL</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.violations.map(idx => {
                                            const point = chartData[idx];
                                            return (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">{idx + 1}</TableCell>
                                                    <TableCell className="text-right font-mono">{point.value.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{point.ucl.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right font-mono">{point.lcl.toFixed(4)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="destructive">
                                                            {point.value > point.ucl ? 'Above UCL' : 'Below LCL'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Run Tests */}
                    {runTests && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Western Electric Run Tests</CardTitle>
                                <CardDescription>Pattern-based detection rules for non-random behavior</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {Object.entries(runTests).map(([key, test]: [string, any]) => (
                                        <Alert key={key} variant={test.violations.length > 0 ? 'destructive' : 'default'}>
                                            {test.violations.length > 0 ? (
                                                <AlertTriangle className="h-4 w-4" />
                                            ) : (
                                                <CheckCircle className="h-4 w-4" />
                                            )}
                                            <AlertTitle>
                                                {test.name}
                                            </AlertTitle>
                                            <AlertDescription>
                                                {test.violations.length === 0 ? (
                                                    'No violations detected'
                                                ) : (
                                                    `Violations at samples: ${test.violations.map((v: number) => v + 1).join(', ')}`
                                                )}
                                            </AlertDescription>
                                        </Alert>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {!isLoading && !results && (
                <div className="text-center text-muted-foreground py-10">
                    <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select chart type and variables, then click &apos;Run Analysis&apos; to generate your control chart.</p>
                </div>
            )}
        </div>
    );
}

'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, HelpCircle, CheckCircle, Settings, FileSearch, Target, BarChart, Activity, AlertTriangle, Info, XCircle, TrendingUp, Download, Bot, CheckCircle2, BookOpen } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import Papa from 'papaparse';

interface ChartResults {
    x_chart: {
        ucl: number;
        lcl: number;
        cl: number;
        sigma: number;
        ucl_1sigma: number;
        lcl_1sigma: number;
        ucl_2sigma: number;
        lcl_2sigma: number;
    };
    r_chart?: {
        ucl: number;
        lcl: number;
        cl: number;
    };
    s_chart?: {
        ucl: number;
        lcl: number;
        cl: number;
    };
    data: {
        x_bar: number[];
        r?: number[];
        s?: number[];
        subgroups: number[];
    };
    subgroup_size: number;
}

interface Performance {
    mean: number;
    median: number;
    std_dev: number;
    min: number;
    max: number;
    range: number;
    cv: number;
}

interface Capability {
    cp: number;
    cpk: number;
    pp: number;
    ppk: number;
    cpu: number;
    cpl: number;
    z_upper: number;
    z_lower: number;
    z_min: number;
    sigma_level: number;
    mean: number;
    std_dev: number;
    target: number;
    offset: number;
    centering_index: number;
    ppm_upper: number;
    ppm_lower: number;
    ppm_total: number;
    yield_percent: number;
}

interface Violation {
    index: number;
    value: number;
    rule: string;
    severity: string;
}

interface Stability {
    status: string;
    message: string;
    color: string;
    total_violations: number;
    critical_violations: number;
    warning_violations: number;
}

interface Insight {
    type: string;
    title: string;
    message: string;
    priority: string;
}

interface SqcResults {
    chart_results: ChartResults;
    capability: Capability | null;
    performance: Performance;
    violations: {
        x_chart: Violation[];
        secondary_chart: Violation[];
    };
    stability: Stability;
    insights: Insight[];
    chart_type: string;
}

interface FullAnalysisResponse {
    results: SqcResults;
    interpretations?: {
        overall_analysis: string;
        test_insights: string[];
        recommendations: string[];
    };
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: SqcResults }) => {
    const capability = results.capability;
    const stability = results.stability;
    const performance = results.performance;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Process Status Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Process Status
                            </p>
                            {stability.status === 'stable' ? 
                                <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                            }
                        </div>
                        <p className="text-2xl font-semibold">
                            {stability.status === 'stable' ? 'In Control' : 'Out of Control'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {stability.total_violations} violation(s) detected
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Process Mean Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Process Mean
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {performance.mean.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            σ = {performance.std_dev.toFixed(3)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Cpk Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Cpk Index
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold font-mono ${
                            !capability ? 'text-gray-400' :
                            capability.cpk >= 1.33 ? 'text-green-600' : 'text-red-600'
                        }`}>
                            {capability ? capability.cpk.toFixed(2) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {!capability ? 'No spec limits' : 
                             capability.cpk >= 1.33 ? 'Capable process' : 'Not capable'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Subgroups Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Subgroups
                            </p>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {results.chart_results.data.subgroups.length}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Size: {results.chart_results.subgroup_size}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const SqcOverview = ({ measurementCol, subgroupCol, chartType, usl, lsl, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (!measurementCol || !subgroupCol) {
            overview.push('Select measurement and subgroup columns to begin');
        } else {
            overview.push(`Measurement: ${measurementCol}`);
            overview.push(`Subgroup: ${subgroupCol}`);
        }

        // Chart type
        const chartName = chartType === 'xbar-r' ? 'X̄-R Chart (Range)' : 'X̄-S Chart (Std Dev)';
        overview.push(`Chart type: ${chartName}`);

        // Specification limits
        if (usl && lsl) {
            overview.push(`Spec limits: LSL=${lsl}, USL=${usl}`);
            overview.push('Capability analysis will be performed');
        } else if (usl || lsl) {
            overview.push(`Partial spec limits: ${usl ? 'USL=' + usl : 'LSL=' + lsl}`);
            overview.push('⚠ Both USL and LSL needed for full capability');
        } else {
            overview.push('No specification limits - control charts only');
        }

        // Data characteristics
        overview.push(`${data.length} total observations`);
        overview.push('Monitors both process location (X̄) and spread (R/S)');
        overview.push('Western Electric Rules applied for violation detection');

        return overview;
    }, [measurementCol, subgroupCol, chartType, usl, lsl, data]);

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

// Generate interpretations based on SPC results
const generateSpcInterpretations = (results: SqcResults) => {
    const insights: string[] = [];
    const stability = results.stability;
    const capability = results.capability;
    const performance = results.performance;
    
    // Overall analysis
    let overall = '';
    if (stability.status === 'stable') {
        overall = `<strong>Process is in statistical control.</strong> The control charts show no special cause variation patterns, indicating the process is stable and predictable. ${
            stability.total_violations === 0 
                ? 'No violations of Western Electric Rules were detected.' 
                : `However, ${stability.total_violations} minor violation(s) were noted for monitoring.`
        } This suggests the process is operating consistently within its natural capability.`;
    } else {
        overall = `<strong>Process is out of statistical control.</strong> The analysis detected ${stability.critical_violations} critical and ${stability.warning_violations} warning-level violations of control limits or Western Electric Rules. This indicates special cause variation is present, meaning something unusual is affecting the process beyond normal random variation. Immediate investigation and corrective action are required to identify and eliminate these special causes.`;
    }
    
    // Control chart insights
    insights.push(`<strong>Control Chart Type:</strong> ${
        results.chart_type === 'xbar-r' 
            ? 'X̄-R Chart is used for subgroups of 2-10 observations, monitoring process mean via X̄ chart and within-subgroup variation via Range (R) chart.' 
            : 'X̄-S Chart is used for larger subgroups (10+), monitoring process mean via X̄ chart and within-subgroup variation via Standard Deviation (S) chart.'
    }`);
    
    // Process performance
    insights.push(`<strong>Process Performance:</strong> Mean = ${performance.mean.toFixed(4)}, Std Dev = ${performance.std_dev.toFixed(4)}, CV = ${performance.cv.toFixed(2)}%. ${
        performance.cv < 10 ? 'Low variability indicates good process consistency.' :
        performance.cv < 20 ? 'Moderate variability - process is reasonably consistent.' :
        'High variability - process inconsistency may need attention.'
    }`);
    
    // Violation insights
    if (stability.critical_violations > 0) {
        insights.push(`<strong>Critical Violations:</strong> ${stability.critical_violations} points exceed control limits (±3σ). This is strong evidence of special cause variation requiring immediate investigation. Common causes include equipment malfunction, material changes, or operator errors.`);
    }
    
    if (stability.warning_violations > 0) {
        insights.push(`<strong>Warning Patterns:</strong> ${stability.warning_violations} pattern-based violations detected (trends, runs, alternating patterns). These suggest non-random behavior that may indicate gradual process shifts, tool wear, or systematic issues.`);
    }
    
    // Capability insights
    if (capability) {
        insights.push(`<strong>Process Capability:</strong> Cp = ${capability.cp.toFixed(2)} (potential capability), Cpk = ${capability.cpk.toFixed(2)} (actual capability). ${
            capability.cpk >= 2.0 ? 'Excellent capability (Six Sigma level) - process is highly capable.' :
            capability.cpk >= 1.33 ? 'Process is capable of meeting specifications with good margin.' :
            capability.cpk >= 1.0 ? 'Marginally capable - process just meets specifications with little room for variation.' :
            'Not capable - process cannot consistently meet specifications even when centered.'
        }`);
        
        insights.push(`<strong>Defect Rate:</strong> Expected ${capability.ppm_total.toFixed(0)} PPM (parts per million) defects, yielding ${capability.yield_percent.toFixed(3)}% conforming product. ${
            capability.ppm_total < 100 ? 'Very low defect rate indicates excellent quality.' :
            capability.ppm_total < 1000 ? 'Low defect rate - acceptable quality level.' :
            capability.ppm_total < 10000 ? 'Moderate defect rate - improvement opportunities exist.' :
            'High defect rate - significant quality issues require attention.'
        }`);
        
        // Centering
        if (Math.abs(capability.offset) > capability.std_dev * 0.25) {
            insights.push(`<strong>Process Centering:</strong> Process mean is offset by ${capability.offset.toFixed(4)} from target (${(capability.centering_index * 100).toFixed(1)}% centered). The process is not well-centered between specification limits. Adjusting the process mean toward target would improve capability.`);
        } else {
            insights.push(`<strong>Process Centering:</strong> Process is well-centered with only ${capability.offset.toFixed(4)} offset from target (${(capability.centering_index * 100).toFixed(1)}% centered). Good centering maximizes the process margin to specification limits.`);
        }
    }
    
    // Recommendations
    let recommendations: string[] = [];
    if (stability.status === 'stable' && capability && capability.cpk >= 1.33) {
        recommendations = [
            '<strong>Maintain regular monitoring</strong> with control charts to ensure continued stability',
            '<strong>Document current operating conditions</strong> as standard procedures',
            '<strong>Use this as baseline</strong> for future improvement initiatives',
            '<strong>Consider opportunities</strong> for specification limit expansion or cost reduction',
            '<strong>Share best practices</strong> with other processes to replicate success'
        ];
    } else if (stability.status === 'stable' && capability && capability.cpk < 1.33) {
        recommendations = [
            '<strong>Ensure process stability</strong> by continued monitoring before making changes',
            '<strong>Reduce variation (improve Cp)</strong> through process improvements, equipment upgrades, or better materials',
            '<strong>Center the process</strong> to improve Cpk by adjusting process mean toward target',
            '<strong>Evaluate specification limits</strong> to ensure they are realistic for the process capability',
            '<strong>Consider process redesign</strong> if capability cannot be improved sufficiently with current setup'
        ];
    } else if (stability.status !== 'stable') {
        recommendations = [
            '<strong>IMMEDIATE PRIORITY:</strong> Investigate all critical violations to identify special causes',
            '<strong>Root cause analysis:</strong> Use process knowledge and tools (5 Whys, fishbone diagrams) to identify causes',
            '<strong>Implement corrective actions</strong> to eliminate special causes and restore stability',
            '<strong>Continue monitoring</strong> to verify that stability is achieved and maintained',
            '<strong>Only after stability:</strong> Then assess and improve capability. Remember: Out-of-control process capability metrics are meaningless'
        ];
    } else {
        recommendations = [
            '<strong>Maintain control charts</strong> and update with new data regularly',
            '<strong>Train operators</strong> on recognizing out-of-control patterns and appropriate responses',
            '<strong>Document and investigate</strong> any violations promptly to prevent recurrence',
            '<strong>Review control limits periodically</strong> to ensure they reflect current process performance',
            '<strong>Set specification limits</strong> if not already done, then calculate capability indices'
        ];
    }
    
    return {
        overall_analysis: overall,
        test_insights: insights,
        recommendations: recommendations
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const sqcExample = exampleDatasets.find(d => d.id === 'sqc-data');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Activity className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Statistical Process Control (SPC)</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Monitor and control process quality using control charts and capability analysis
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Control Charts</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    X-bar and R/S charts to monitor process mean and variation over time
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Process Capability</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Cp, Cpk indices to assess if process meets specification limits
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <AlertTriangle className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Violation Detection</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Western Electric Rules for out-of-control detection
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Statistical Process Control
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Statistical Process Control uses control charts to distinguish between common cause variation 
                            (natural process variation) and special cause variation (indicating a problem). This helps 
                            maintain consistent quality and identify when corrective action is needed. SPC is essential 
                            for manufacturing, service processes, and any situation where consistent quality is critical.
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
                                        <span><strong>Measurement:</strong> Numeric quality characteristic</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Subgroup:</strong> Logical grouping (time, batch, etc.)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Equal sizes:</strong> All subgroups same size (2-25)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min subgroups:</strong> 20+ for reliable limits</span>
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
                                        <span><strong>In Control:</strong> Only common cause variation</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Out of Control:</strong> Special causes present</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Cpk ≥ 1.33:</strong> Process capable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Violations:</strong> Require investigation</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {sqcExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(sqcExample)} size="lg">
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

interface SqcPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function SqcPage({ data, numericHeaders, categoricalHeaders, allHeaders, onLoadExample, onGenerateReport }: SqcPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [measurementCol, setMeasurementCol] = useState<string | undefined>();
    const [subgroupCol, setSubgroupCol] = useState<string | undefined>();
    const [chartType, setChartType] = useState('xbar-r');
    const [usl, setUsl] = useState('');
    const [lsl, setLsl] = useState('');

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);

    useEffect(() => {
        setMeasurementCol(numericHeaders[0]);
        setSubgroupCol(allHeaders.find(h => !numericHeaders.includes(h)) || allHeaders.find(h => h !== numericHeaders[0]));
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [numericHeaders, allHeaders, canRun]);
    
    const handleAnalysis = useCallback(async () => {
        if (!measurementCol || !subgroupCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select all required fields.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/sqc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    measurement_col: measurementCol, 
                    subgroup_col: subgroupCol, 
                    chart_type: chartType,
                    usl: usl ? parseFloat(usl) : null,
                    lsl: lsl ? parseFloat(lsl) : null,
                })
            });
            
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Generate interpretations
            const interpretations = generateSpcInterpretations(result.results);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);
            
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, measurementCol, subgroupCol, chartType, usl, lsl, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "SPC results are not available." });
            return;
        }
        
        const results = analysisResult.results;
        const chartData = results.chart_results.data;
        
        // Prepare data for export
        const exportData = chartData.subgroups.map((sg, idx) => ({
            subgroup: sg,
            x_bar: chartData.x_bar[idx],
            range: chartData.r ? chartData.r[idx] : null,
            std_dev: chartData.s ? chartData.s[idx] : null,
            x_ucl: results.chart_results.x_chart.ucl,
            x_lcl: results.chart_results.x_chart.lcl,
            x_cl: results.chart_results.x_chart.cl,
            status: results.violations.x_chart.find(v => v.index === sg) ? 'Violation' : 'OK'
        }));
        
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'spc_control_chart_data.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "SPC data is being downloaded." });
    }, [analysisResult, toast]);

    const handleLoadExampleData = () => {
        const sqcExample = exampleDatasets.find(ex => ex.id === 'sqc-data');
        if (sqcExample) {
            onLoadExample(sqcExample);
            setMeasurementCol('measurement');
            setSubgroupCol('subgroup');
            setUsl('11');
            setLsl('9');
            setView('main');
        }
    };
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }

    const results = analysisResult?.results;
    const chartData = results ? results.chart_results.data : null;
    const xChartViolations = results?.violations.x_chart || [];
    const secondaryViolations = results?.violations.secondary_chart || [];
    const capability = results?.capability;
    const performance = results?.performance;
    const stability = results?.stability;
    const insights = results?.insights || [];

    // Get severity icon
    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return <XCircle className="w-4 h-4 text-red-600" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
            case 'info': return <Info className="w-4 h-4 text-blue-600" />;
            default: return <Info className="w-4 h-4 text-gray-600" />;
        }
    };

    // Prepare X-bar chart data
    const xBarChartData = chartData ? chartData.subgroups.map((subgroup, idx) => ({
        subgroup,
        value: chartData.x_bar[idx],
        ucl: results.chart_results.x_chart.ucl,
        lcl: results.chart_results.x_chart.lcl,
        cl: results.chart_results.x_chart.cl,
        ucl_1sigma: results.chart_results.x_chart.ucl_1sigma,
        lcl_1sigma: results.chart_results.x_chart.lcl_1sigma,
        ucl_2sigma: results.chart_results.x_chart.ucl_2sigma,
        lcl_2sigma: results.chart_results.x_chart.lcl_2sigma,
        violation: xChartViolations.find(v => v.index === subgroup)
    })) : [];

    // Prepare R or S chart data
    const secondaryChartData = chartData ? chartData.subgroups.map((subgroup, idx) => {
        const secondaryChart = results.chart_results.r_chart || results.chart_results.s_chart;
        const secondaryValue = chartData.r ? chartData.r[idx] : (chartData.s ? chartData.s[idx] : 0);
        
        return {
            subgroup,
            value: secondaryValue,
            ucl: secondaryChart?.ucl || 0,
            lcl: secondaryChart?.lcl || 0,
            cl: secondaryChart?.cl || 0,
            violation: secondaryViolations.find(v => v.index === subgroup)
        };
    }) : [];

    const secondaryChartLabel = chartType === 'xbar-r' ? 'Range (R)' : 'Std Dev (S)';

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">SPC Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Configure control chart parameters and specification limits
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="measurement-col">Measurement Column</Label>
                            <Select value={measurementCol} onValueChange={setMeasurementCol}>
                                <SelectTrigger id="measurement-col">
                                    <SelectValue placeholder="Select measurement" />
                                </SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="subgroup-col">Subgroup Column</Label>
                            <Select value={subgroupCol} onValueChange={setSubgroupCol}>
                                <SelectTrigger id="subgroup-col">
                                    <SelectValue placeholder="Select subgroup" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="chart-type">Chart Type</Label>
                            <Select value={chartType} onValueChange={setChartType}>
                                <SelectTrigger id="chart-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="xbar-r">X̄-R Chart (n: 2-10)</SelectItem>
                                    <SelectItem value="xbar-s">X̄-S Chart (n: 10+)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="usl">Upper Specification Limit (USL)</Label>
                            <Input 
                                id="usl"
                                type="number" 
                                step="any"
                                value={usl} 
                                onChange={e => setUsl(e.target.value)} 
                                placeholder="Optional - for capability analysis"
                            />
                        </div>
                        <div>
                            <Label htmlFor="lsl">Lower Specification Limit (LSL)</Label>
                            <Input 
                                id="lsl"
                                type="number" 
                                step="any"
                                value={lsl} 
                                onChange={e => setLsl(e.target.value)} 
                                placeholder="Optional - for capability analysis"
                            />
                        </div>
                    </div>

                    {/* Analysis Overview */}
                    <SqcOverview 
                        measurementCol={measurementCol}
                        subgroupCol={subgroupCol}
                        chartType={chartType}
                        usl={usl}
                        lsl={lsl}
                        data={data}
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
                                    Export Data
                                </Button>
                            </>
                        )}
                    </div>
                    <Button onClick={handleAnalysis} disabled={isLoading || !measurementCol || !subgroupCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Analyze Process</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Running SPC analysis...</p>
                        <Skeleton className="h-[600px] w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResult && results && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Analysis Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                            <CardDescription>Process control status and capability assessment</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={stability.status === 'stable' ? 'default' : 'destructive'}
                                   className={stability.status === 'stable' ? 'border-green-200 bg-green-50' : ''}>
                                {stability.status === 'stable' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                <AlertTitle>
                                    {stability.status === 'stable' ? 'Process In Statistical Control' : 'Process Out of Control'}
                                </AlertTitle>
                                <AlertDescription>{stability.message}</AlertDescription>
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
                                        <BarChart className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Process Control Assessment</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }}
                                />
                            </div>

                            {/* Test Insights */}
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
                            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-amber-500/10 rounded-md">
                                        <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <h3 className="font-semibold text-base">Recommendations</h3>
                                </div>
                                <ul className="space-y-3">
                                    {analysisResult.interpretations?.recommendations.map((rec, idx) => (
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
                        </CardContent>
                    </Card>

                    {/* Main Tabs */}
                    <Tabs defaultValue="charts" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="charts">Control Charts</TabsTrigger>
                            <TabsTrigger value="capability">Capability</TabsTrigger>
                            <TabsTrigger value="violations">Violations</TabsTrigger>
                            <TabsTrigger value="data">Data Table</TabsTrigger>
                        </TabsList>

                        {/* Control Charts Tab */}
                        <TabsContent value="charts" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>X̄ Chart - Process Mean</CardTitle>
                                    <CardDescription>Monitors the average of each subgroup over time</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <ComposedChart data={xBarChartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="subgroup" label={{ value: 'Subgroup', position: 'insideBottom', offset: -5 }} />
                                            <YAxis label={{ value: 'X̄', angle: -90, position: 'insideLeft' }} />
                                            <Tooltip />
                                            <Legend />
                                            
                                            {/* Sigma zones */}
                                            <Area type="monotone" dataKey="ucl_1sigma" fill="#86efac" fillOpacity={0.2} stroke="none" name="±1σ Zone" />
                                            <Area type="monotone" dataKey="lcl_1sigma" fill="#86efac" fillOpacity={0.2} stroke="none" />
                                            <Area type="monotone" dataKey="ucl_2sigma" fill="#fde047" fillOpacity={0.2} stroke="none" name="±2σ Zone" />
                                            <Area type="monotone" dataKey="lcl_2sigma" fill="#fde047" fillOpacity={0.2} stroke="none" />
                                            
                                            <ReferenceLine y={xBarChartData[0]?.ucl} stroke="red" strokeDasharray="3 3" label="UCL" />
                                            <ReferenceLine y={xBarChartData[0]?.lcl} stroke="red" strokeDasharray="3 3" label="LCL" />
                                            <ReferenceLine y={xBarChartData[0]?.cl} stroke="green" strokeWidth={2} label="CL" />
                                            
                                            <Line 
                                                type="monotone" 
                                                dataKey="value" 
                                                stroke="#2563eb" 
                                                strokeWidth={2}
                                                dot={(props: any) => {
                                                    const violation = props.payload.violation;
                                                    if (violation) {
                                                        return (
                                                            <circle 
                                                                cx={props.cx} 
                                                                cy={props.cy} 
                                                                r={6} 
                                                                fill={violation.severity === 'critical' ? '#dc2626' : '#f59e0b'}
                                                                stroke="white"
                                                                strokeWidth={2}
                                                            />
                                                        );
                                                    }
                                                    return <circle cx={props.cx} cy={props.cy} r={4} fill="#2563eb" />;
                                                }}
                                                name="X̄"
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>{secondaryChartLabel} Chart - Process Variation</CardTitle>
                                    <CardDescription>Monitors the variability within each subgroup</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <LineChart data={secondaryChartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="subgroup" label={{ value: 'Subgroup', position: 'insideBottom', offset: -5 }} />
                                            <YAxis label={{ value: secondaryChartLabel, angle: -90, position: 'insideLeft' }} />
                                            <Tooltip />
                                            <Legend />
                                            <ReferenceLine y={secondaryChartData[0]?.ucl} stroke="red" strokeDasharray="3 3" label="UCL" />
                                            <ReferenceLine y={secondaryChartData[0]?.lcl} stroke="red" strokeDasharray="3 3" label="LCL" />
                                            <ReferenceLine y={secondaryChartData[0]?.cl} stroke="green" strokeWidth={2} label="CL" />
                                            <Line 
                                                type="monotone" 
                                                dataKey="value" 
                                                stroke="#8b5cf6" 
                                                strokeWidth={2}
                                                dot={(props: any) => {
                                                    const violation = props.payload.violation;
                                                    if (violation) {
                                                        return (
                                                            <circle 
                                                                cx={props.cx} 
                                                                cy={props.cy} 
                                                                r={6} 
                                                                fill={violation.severity === 'critical' ? '#dc2626' : '#f59e0b'}
                                                                stroke="white"
                                                                strokeWidth={2}
                                                            />
                                                        );
                                                    }
                                                    return <circle cx={props.cx} cy={props.cy} r={4} fill="#8b5cf6" />;
                                                }}
                                                name={secondaryChartLabel}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Capability Tab */}
                        <TabsContent value="capability" className="space-y-4">
                            {capability ? (
                                <>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Process Capability Indices</CardTitle>
                                                <CardDescription>How well the process meets specifications</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground mb-1">Cp (Potential)</p>
                                                        <p className="text-3xl font-bold">{capability.cp.toFixed(3)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-muted-foreground mb-1">Cpk (Actual)</p>
                                                        <p className="text-3xl font-bold text-primary">{capability.cpk.toFixed(3)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-muted-foreground mb-1">Cpu (Upper)</p>
                                                        <p className="text-2xl font-bold">{capability.cpu.toFixed(3)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-muted-foreground mb-1">Cpl (Lower)</p>
                                                        <p className="text-2xl font-bold">{capability.cpl.toFixed(3)}</p>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-sm font-medium">Capability Rating</span>
                                                        <Badge variant={capability.cpk >= 1.33 ? 'default' : 'destructive'}>
                                                            {capability.cpk >= 2.0 ? 'Excellent (6σ)' :
                                                             capability.cpk >= 1.33 ? 'Capable' :
                                                             capability.cpk >= 1.0 ? 'Marginal' : 'Not Capable'}
                                                        </Badge>
                                                    </div>
                                                    <Progress value={Math.min(capability.cpk / 2 * 100, 100)} className="h-2" />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Process Performance</CardTitle>
                                                <CardDescription>Key statistical measures</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-muted-foreground">Process Mean (μ)</span>
                                                    <span className="font-semibold">{capability.mean.toFixed(4)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-muted-foreground">Std Deviation (σ)</span>
                                                    <span className="font-semibold">{capability.std_dev.toFixed(4)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-muted-foreground">Target Value</span>
                                                    <span className="font-semibold">{capability.target.toFixed(4)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-muted-foreground">Offset from Target</span>
                                                    <span className={`font-semibold ${Math.abs(capability.offset) > capability.std_dev * 0.5 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                        {capability.offset > 0 ? '+' : ''}{capability.offset.toFixed(4)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-muted-foreground">Centering Index</span>
                                                    <span className="font-semibold">{(capability.centering_index * 100).toFixed(1)}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-muted-foreground">Sigma Level</span>
                                                    <span className="font-semibold">{capability.sigma_level.toFixed(2)}σ</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Defect Rate Analysis</CardTitle>
                                            <CardDescription>Expected defects per million opportunities (PPM)</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid md:grid-cols-4 gap-4">
                                                <div className="text-center p-4 bg-red-50 rounded-lg">
                                                    <p className="text-sm text-muted-foreground mb-1">Upper Spec</p>
                                                    <p className="text-2xl font-bold text-red-600">{capability.ppm_upper.toFixed(0)}</p>
                                                    <p className="text-xs text-muted-foreground">PPM</p>
                                                </div>
                                                <div className="text-center p-4 bg-red-50 rounded-lg">
                                                    <p className="text-sm text-muted-foreground mb-1">Lower Spec</p>
                                                    <p className="text-2xl font-bold text-red-600">{capability.ppm_lower.toFixed(0)}</p>
                                                    <p className="text-xs text-muted-foreground">PPM</p>
                                                </div>
                                                <div className="text-center p-4 bg-orange-50 rounded-lg">
                                                    <p className="text-sm text-muted-foreground mb-1">Total Defects</p>
                                                    <p className="text-2xl font-bold text-orange-600">{capability.ppm_total.toFixed(0)}</p>
                                                    <p className="text-xs text-muted-foreground">PPM</p>
                                                </div>
                                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                                    <p className="text-sm text-muted-foreground mb-1">Process Yield</p>
                                                    <p className="text-2xl font-bold text-green-600">{capability.yield_percent.toFixed(3)}%</p>
                                                    <p className="text-xs text-muted-foreground">Quality</p>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                                                <h4 className="font-semibold mb-2">Z-Score Analysis</h4>
                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Z Upper:</span>
                                                        <span className="ml-2 font-semibold">{capability.z_upper.toFixed(3)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Z Lower:</span>
                                                        <span className="ml-2 font-semibold">{capability.z_lower.toFixed(3)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Z Min:</span>
                                                        <span className="ml-2 font-semibold">{capability.z_min.toFixed(3)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </>
                            ) : (
                                <Card>
                                    <CardContent className="py-12">
                                        <div className="text-center text-muted-foreground">
                                            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                            <p className="text-lg font-semibold mb-2">No Capability Analysis</p>
                                            <p className="text-sm">Please specify both USL and LSL to perform capability analysis</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        {/* Violations Tab */}
                        <TabsContent value="violations" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Western Electric Rules Violations</CardTitle>
                                    <CardDescription>Detected out-of-control conditions</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {xChartViolations.length === 0 && secondaryViolations.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                                            <p className="text-lg font-semibold mb-2">No Violations Detected</p>
                                            <p className="text-sm">Process is in statistical control</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {xChartViolations.length > 0 && (
                                                <div>
                                                    <h3 className="font-semibold mb-3">X̄ Chart Violations ({xChartViolations.length})</h3>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Severity</TableHead>
                                                                <TableHead>Subgroup</TableHead>
                                                                <TableHead>Value</TableHead>
                                                                <TableHead>Rule</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {xChartViolations.map((v, idx) => (
                                                                <TableRow key={idx}>
                                                                    <TableCell>{getSeverityIcon(v.severity)}</TableCell>
                                                                    <TableCell className="font-medium">{v.index}</TableCell>
                                                                    <TableCell>{v.value.toFixed(4)}</TableCell>
                                                                    <TableCell className="text-sm">{v.rule}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}

                                            {secondaryViolations.length > 0 && (
                                                <div>
                                                    <h3 className="font-semibold mb-3">{secondaryChartLabel} Chart Violations ({secondaryViolations.length})</h3>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Severity</TableHead>
                                                                <TableHead>Subgroup</TableHead>
                                                                <TableHead>Value</TableHead>
                                                                <TableHead>Rule</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {secondaryViolations.map((v, idx) => (
                                                                <TableRow key={idx}>
                                                                    <TableCell>{getSeverityIcon(v.severity)}</TableCell>
                                                                    <TableCell className="font-medium">{v.index}</TableCell>
                                                                    <TableCell>{v.value.toFixed(4)}</TableCell>
                                                                    <TableCell className="text-sm">{v.rule}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}

                                            <div className="bg-muted/50 rounded-lg p-4">
                                                <h4 className="font-semibold mb-2">Western Electric Rules Reference</h4>
                                                <ul className="space-y-1 text-sm text-muted-foreground">
                                                    <li>• <strong>Rule 1:</strong> Any point beyond 3σ (control limits) - Critical</li>
                                                    <li>• <strong>Rule 2:</strong> 9+ consecutive points on same side of center - Warning</li>
                                                    <li>• <strong>Rule 3:</strong> 6+ consecutive points trending up/down - Warning</li>
                                                    <li>• <strong>Rule 4:</strong> 14+ consecutive alternating points - Info</li>
                                                    <li>• <strong>Rule 5:</strong> 2/3 points beyond 2σ limits - Warning</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Data Table Tab */}
                        <TabsContent value="data" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Process Data</CardTitle>
                                    <CardDescription>Subgroup statistics and control chart data</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border max-h-[600px] overflow-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Subgroup</TableHead>
                                                    <TableHead>X̄</TableHead>
                                                    <TableHead>{secondaryChartLabel}</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {chartData?.subgroups.map((sg, idx) => {
                                                    const xViolation = xChartViolations.find(v => v.index === sg);
                                                    const secViolation = secondaryViolations.find(v => v.index === sg);
                                                    const hasViolation = xViolation || secViolation;
                                                    
                                                    return (
                                                        <TableRow key={idx} className={hasViolation ? 'bg-red-50' : ''}>
                                                            <TableCell className="font-medium">{sg}</TableCell>
                                                            <TableCell>{chartData.x_bar[idx].toFixed(4)}</TableCell>
                                                            <TableCell>
                                                                {chartData.r ? chartData.r[idx].toFixed(4) : 
                                                                 chartData.s ? chartData.s[idx].toFixed(4) : '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {hasViolation ? (
                                                                    <Badge variant="destructive">Violation</Badge>
                                                                ) : (
                                                                    <Badge variant="outline">OK</Badge>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Activity className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure parameters and click &apos;Analyze Process&apos; to begin SPC analysis.</p>
                </div>
            )}
        </div>
    );
}

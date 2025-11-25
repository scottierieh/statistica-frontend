'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, FileJson, Asterisk, HelpCircle, Award, MoveRight, Building, Hospital, Landmark, GraduationCap, BarChart as BarChartIcon, Image as ImageIcon, GitCommit, TrendingUp, Target, Layers, CheckCircle, AlertTriangle, Info, Activity, BookOpen, Settings, FileSearch, Download, Bot } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { produce } from 'immer';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, ResponsiveContainer, ScatterChart, Scatter, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import type { DataSet } from '@/lib/stats';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import Papa from 'papaparse';


interface DeaResults {
    efficiency_scores: { [key: string]: number };
    reference_sets: { [key: string]: string[] };
    lambdas: { [key: string]: number[] };
    summary: {
        total_dmus: number;
        efficient_dmus: number;
        inefficient_dmus: number;
        average_efficiency: number;
    };
    dmu_col: string;
    dmu_names: string[];
    interpretation: string;
    input_cols: string[];
    output_cols: string[];
    improvement_potential: {
        dmu: string;
        score: number;
        targets: {
            type: 'input' | 'output';
            name: string;
            actual: number;
            target: number;
            improvement_pct: number;
        }[];
        slacks: {
            inputs: { [key: string]: number };
            outputs: { [key: string]: number };
        }
    }[];
}

interface FullDeaResponse {
    results: DeaResults;
    plot?: string;
    interpretations?: {
        overall_analysis: string;
        model_insights: string[];
        recommendations: string;
    };
}

// Generate interpretations based on DEA results
const generateDEAInterpretations = (results: DeaResults, orientation: string, returnsToScale: string) => {
    const insights: string[] = [];
    
    const efficiencyRate = (results.summary.efficient_dmus / results.summary.total_dmus) * 100;
    const avgEfficiency = results.summary.average_efficiency * 100;
    
    // Overall analysis
    let overall = '';
    if (efficiencyRate >= 50) {
        overall = `<strong>Strong overall performance detected.</strong> ${results.summary.efficient_dmus} out of ${results.summary.total_dmus} DMUs (${efficiencyRate.toFixed(1)}%) are operating on the efficiency frontier. The average efficiency score is ${avgEfficiency.toFixed(1)}%, indicating that most units are performing well relative to best practices.`;
    } else if (efficiencyRate >= 25) {
        overall = `<strong>Moderate performance with improvement opportunities.</strong> ${results.summary.efficient_dmus} out of ${results.summary.total_dmus} DMUs (${efficiencyRate.toFixed(1)}%) are efficient, with an average efficiency of ${avgEfficiency.toFixed(1)}%. This suggests significant room for improvement by benchmarking against top performers.`;
    } else {
        overall = `<strong>Substantial inefficiency detected across the sample.</strong> Only ${results.summary.efficient_dmus} out of ${results.summary.total_dmus} DMUs (${efficiencyRate.toFixed(1)}%) are operating efficiently, with an average efficiency of ${avgEfficiency.toFixed(1)}%. Most units have considerable potential for improvement.`;
    }
    
    // Efficiency distribution
    const scores = Object.values(results.efficiency_scores);
    const mostlyEfficient = scores.filter(s => s >= 0.9 && s < 1).length;
    const needsImprovement = scores.filter(s => s >= 0.8 && s < 0.9).length;
    const inefficient = scores.filter(s => s < 0.8).length;
    
    insights.push(`<strong>Efficiency Distribution:</strong> ${results.summary.efficient_dmus} efficient (100%), ${mostlyEfficient} mostly efficient (90-100%), ${needsImprovement} need improvement (80-90%), and ${inefficient} are inefficient (<80%). This distribution reveals the performance spread across your DMUs.`);
    
    // Model specification
    const orientationText = orientation === 'input' ? 'input-oriented (minimizing inputs for given outputs)' : 'output-oriented (maximizing outputs for given inputs)';
    const rtsText = returnsToScale === 'crs' ? 'constant returns to scale (CRS), assuming proportional input-output relationships' : 'variable returns to scale (VRS), allowing for scale inefficiencies';
    insights.push(`<strong>Model Specification:</strong> This analysis uses a ${orientationText} approach with ${rtsText}. The model identifies ${results.summary.efficient_dmus} DMUs as benchmarks that define the efficiency frontier.`);
    
    // Top and bottom performers
    const sortedDMUs = Object.entries(results.efficiency_scores).sort(([, a], [, b]) => b - a);
    const topPerformers = sortedDMUs.slice(0, Math.min(3, sortedDMUs.length)).filter(([, score]) => score >= 1);
    const bottomPerformers = sortedDMUs.slice(-3).filter(([, score]) => score < 1);
    
    if (topPerformers.length > 0) {
        const topNames = topPerformers.map(([name]) => name).join(', ');
        insights.push(`<strong>Best Performers:</strong> ${topNames} are operating on the efficiency frontier (score = 1.0) and serve as benchmarks for other DMUs. These units represent best practices in converting inputs to outputs.`);
    }
    
    if (bottomPerformers.length > 0) {
        const bottomList = bottomPerformers.map(([name, score]) => `${name} (${(score * 100).toFixed(1)}%)`).join(', ');
        insights.push(`<strong>Units Needing Most Improvement:</strong> ${bottomList}. These DMUs have the largest efficiency gaps and would benefit most from adopting practices of efficient peers.`);
    }
    
    // Improvement potential
    if (results.improvement_potential && results.improvement_potential.length > 0) {
        const totalImprovements = results.improvement_potential.reduce((sum, item) => 
            sum + item.targets.filter(t => t.improvement_pct > 0).length, 0
        );
        insights.push(`<strong>Improvement Opportunities:</strong> ${results.improvement_potential.length} inefficient DMUs have specific improvement targets identified. In total, ${totalImprovements} input/output adjustments are recommended to reach the efficiency frontier.`);
    }
    
    // Input/Output insight
    insights.push(`<strong>Variables Analyzed:</strong> ${results.input_cols.length} input variable(s) (${results.input_cols.join(', ')}) and ${results.output_cols.length} output variable(s) (${results.output_cols.join(', ')}). DEA identifies how efficiently each DMU converts these inputs into outputs.`);
    
    // Recommendations
    let recommendations = '';
    if (efficiencyRate < 30) {
        recommendations = `<p class="mb-3">Low efficiency rates suggest systemic issues. To improve organizational performance:</p>
<ul class="space-y-2 ml-4">
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>Conduct detailed analysis of top-performing units to identify best practices and transferable strategies</span>
    </li>
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>Implement peer-learning programs where efficient DMUs mentor inefficient ones</span>
    </li>
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>Use improvement targets as specific, data-driven performance goals for each unit</span>
    </li>
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>Consider whether organizational structure or resource allocation policies may be constraining performance</span>
    </li>
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>If using VRS, examine whether scale inefficiencies suggest optimal size ranges for DMUs</span>
    </li>
</ul>`;
    } else if (efficiencyRate >= 50) {
        recommendations = `<p class="mb-3">Strong performance overall. To maintain and enhance efficiency:</p>
<ul class="space-y-2 ml-4">
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>Continue monitoring efficiency scores regularly to detect performance degradation early</span>
    </li>
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>Share best practices from efficient units across the organization through formal knowledge transfer</span>
    </li>
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>Focus improvement efforts on the remaining inefficient units using targeted interventions</span>
    </li>
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>Consider expanding the analysis to include quality metrics or customer satisfaction as outputs</span>
    </li>
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>Use DEA results to inform resource allocation and reward high-performing units</span>
    </li>
</ul>`;
    } else {
        recommendations = `<p class="mb-3">Moderate efficiency with clear improvement paths. Action steps:</p>
<ul class="space-y-2 ml-4">
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>Prioritize support for units with scores between 0.8-0.9 as they're closest to efficiency</span>
    </li>
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>Study the reference sets (peer groups) for each inefficient unit and facilitate direct comparisons</span>
    </li>
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>Use the improvement targets table to create specific action plans with measurable goals</span>
    </li>
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>Investigate whether inefficient units face different operating conditions that justify adjustments</span>
    </li>
    <li class="flex items-start gap-2">
        <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
        <span>Run sensitivity analysis by varying inputs/outputs to understand which factors drive efficiency most</span>
    </li>
</ul>`;
    }
    
    return {
        overall_analysis: overall,
        model_insights: insights,
        recommendations: recommendations
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <BarChartIcon className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Data Envelopment Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Measure relative efficiency of decision-making units using multiple inputs and outputs
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Award className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Efficiency Frontier</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Best-practice benchmark
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Performance Gaps</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify improvement areas
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Peer Learning</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Learn from top performers
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use DEA
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use DEA to evaluate the relative efficiency of comparable units (DMUs) that use similar 
                            inputs to produce similar outputs. Common applications include comparing bank branches, 
                            hospitals, schools, retail stores, or manufacturing plants. DEA is particularly useful 
                            when you have multiple performance metrics and want to identify best practices and 
                            improvement opportunities.
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
                                        <span><strong>DMUs:</strong> Comparable decision-making units</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Inputs:</strong> Resources consumed (costs, labor)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Outputs:</strong> Products/services (revenue, quality)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min Units:</strong> 3× (inputs + outputs)</span>
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
                                        <span><strong>Score:</strong> 1.0 = efficient, &lt;1.0 = inefficient</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Peers:</strong> Best-practice benchmarks</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Targets:</strong> Specific improvement goals</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Frontier:</strong> Achievable best performance</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-2">
                        <Button onClick={onLoadExample} size="lg">
                            <Landmark className="mr-2 h-5 w-5" />
                            Load Example Dataset
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: DeaResults }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Efficient Units Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Efficient Units
                            </p>
                            <Award className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold text-green-600">
                            {results.summary.efficient_dmus}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            On efficiency frontier
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Inefficient Units Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Inefficient Units
                            </p>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                            {results.summary.inefficient_dmus}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Need improvement
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Average Efficiency Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Average Efficiency
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {(results.summary.average_efficiency * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Overall performance
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Total Units Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Total DMUs
                            </p>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.summary.total_dmus}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Units analyzed
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component
const DeaOverview = ({ dmuCol, inputCols, outputCols, orientation, returnsToScale, dataLength }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Configuration status
        if (!dmuCol) {
            overview.push('⚠ Select DMU identifier column');
        } else {
            overview.push(`DMU identifier: ${dmuCol}`);
        }
        
        if (inputCols.length === 0) {
            overview.push('⚠ Select at least one input variable');
        } else {
            overview.push(`Input variables (${inputCols.length}): ${inputCols.join(', ')}`);
        }
        
        if (outputCols.length === 0) {
            overview.push('⚠ Select at least one output variable');
        } else {
            overview.push(`Output variables (${outputCols.length}): ${outputCols.join(', ')}`);
        }

        // Data characteristics
        overview.push(`${dataLength} DMUs available for analysis`);

        // Orientation
        overview.push(`Orientation: ${orientation === 'input' ? 'Input-oriented (minimize inputs)' : 'Output-oriented (maximize outputs)'}`);
        
        // Returns to Scale
        overview.push(`Returns to scale: ${returnsToScale === 'crs' ? 'Constant (CRS)' : 'Variable (VRS)'}`);
        
        // Rule of thumb check
        const minRequired = 3 * (inputCols.length + outputCols.length);
        if (inputCols.length > 0 && outputCols.length > 0) {
            if (dataLength < minRequired) {
                overview.push(`⚠ Sample size below recommended (need ${minRequired} DMUs)`);
            } else {
                overview.push(`Sample size adequate (${minRequired}+ DMUs recommended)`);
            }
        }

        return overview;
    }, [dmuCol, inputCols, outputCols, orientation, returnsToScale, dataLength]);

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

interface DeaPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

export default function DeaPage({ data, allHeaders, numericHeaders, onLoadExample, onGenerateReport }: DeaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dmuCol, setDmuCol] = useState<string | undefined>();
    const [inputCols, setInputCols] = useState<string[]>([]);
    const [outputCols, setOutputCols] = useState<string[]>([]);
    const [orientation, setOrientation] = useState<'input' | 'output'>('input');
    const [returnsToScale, setReturnsToScale] = useState<'crs' | 'vrs'>('crs');
    
    const [analysisResult, setAnalysisResult] = useState<FullDeaResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 3, [data, allHeaders]);
    
    const availableCols = useMemo(() => numericHeaders.filter(h => h !== dmuCol), [numericHeaders, dmuCol]);
    
    const results = analysisResult?.results;

    const efficiencyTiers = useMemo(() => {
        if (!results) return { efficient: 0, mostly: 0, needs: 0, inefficient: 0 };
        const scores = Object.values(results.efficiency_scores);
        return {
            efficient: scores.filter(s => s >= 1).length,
            mostly: scores.filter(s => s >= 0.9 && s < 1).length,
            needs: scores.filter(s => s >= 0.8 && s < 0.9).length,
            inefficient: scores.filter(s => s < 0.8).length,
        };
    }, [results]);

    const tierData = useMemo(() => [
        { name: 'Efficient (>=1)', count: efficiencyTiers.efficient, fill: 'hsl(var(--chart-2))' },
        { name: 'Mostly (0.9-1)', count: efficiencyTiers.mostly, fill: 'hsl(var(--chart-3))' },
        { name: 'Needs Imp. (0.8-0.9)', count: efficiencyTiers.needs, fill: 'hsl(var(--chart-4))' },
        { name: 'Inefficient (<0.8)', count: efficiencyTiers.inefficient, fill: 'hsl(var(--chart-5))' },
    ], [efficiencyTiers]);

    const tierChartConfig = useMemo(() => ({ 
        count: { label: 'DMUs' }, 
        efficient: { color: 'hsl(var(--chart-2))' }, 
        mostly: { color: 'hsl(var(--chart-3))' }, 
        needs: { color: 'hsl(var(--chart-4))' }, 
        inefficient: { color: 'hsl(var(--chart-5))' }
    }), []);

    const ioChartData = useMemo(() => {
        if (!results || !results.input_cols || !results.output_cols) return [];
        const firstInput = results.input_cols[0];
        const firstOutput = results.output_cols[0];
        if (!firstInput || !firstOutput) return [];
        
        return data.map(row => ({
            name: row[dmuCol!],
            [firstInput]: row[firstInput],
            [firstOutput]: row[firstOutput]
        }));
    }, [results, data, dmuCol]);

    useEffect(() => {
        const potentialDmu = allHeaders.find(h => !numericHeaders.includes(h) && new Set(data.map(row => row[h])).size === data.length);
        setDmuCol(potentialDmu || allHeaders[0]);
    }, [data, allHeaders, numericHeaders]);

    useEffect(() => {
        if (canRun) {
            const remainingCols = numericHeaders.filter(h => h !== dmuCol);
            if (remainingCols.length >= 2) {
                setInputCols([remainingCols[0]]);
                setOutputCols([remainingCols[1]]);
            } else if (remainingCols.length === 1) {
                setInputCols([remainingCols[0]]);
                setOutputCols([]);
            } else {
                setInputCols([]);
                setOutputCols([]);
            }
            setView('main');
        } else {
            setView('intro');
        }
        setAnalysisResult(null);
    }, [dmuCol, numericHeaders, canRun]);
    
    const handleVarChange = (header: string, checked: boolean, type: 'input' | 'output') => {
        const setCols = type === 'input' ? setInputCols : setOutputCols;
        setCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!dmuCol || inputCols.length === 0 || outputCols.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a DMU column, at least one input, and at least one output.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/dea', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    dmu_col: dmuCol,
                    input_cols: inputCols,
                    output_cols: outputCols,
                    orientation,
                    rts: returnsToScale
                })
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Generate interpretations
            const interpretations = generateDEAInterpretations(result.results, orientation, returnsToScale);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }

    }, [data, dmuCol, inputCols, outputCols, orientation, returnsToScale, toast]);
    
    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Analysis results are not available." });
            return;
        }
        
        const resultsData = Object.entries(analysisResult.results.efficiency_scores).map(([dmu, score]) => ({
            dmu,
            efficiency_score: score,
            status: score >= 1 ? 'Efficient' : score >= 0.9 ? 'Mostly Efficient' : score >= 0.8 ? 'Needs Improvement' : 'Inefficient',
            reference_set: analysisResult.results.reference_sets[dmu]?.join('; ') || 'N/A'
        }));
        
        const csv = Papa.unparse(resultsData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dea_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "DEA results are being downloaded." });
    }, [analysisResult, toast]);
    
    const handleLoadExampleData = () => {
        const deaExample = exampleDatasets.find(ex => ex.id === 'dea-bank-data');
        if (deaExample) {
            onLoadExample(deaExample);
            setView('main');
        }
    };
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">DEA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>
                        Define your Decision Making Units (DMUs), inputs, and outputs for efficiency analysis.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="dmuCol">Decision Making Units (DMU)</Label>
                            <Select value={dmuCol} onValueChange={setDmuCol}>
                                <SelectTrigger id="dmuCol"><SelectValue placeholder="Select DMU..." /></SelectTrigger>
                                <SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                            {dmuCol && (
                                <p className="text-xs text-muted-foreground">
                                    <Badge variant="outline">{data.length} units</Badge>
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="orientation">Orientation</Label>
                            <Select value={orientation} onValueChange={(v) => setOrientation(v as any)}>
                                <SelectTrigger id="orientation"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="input">Input-Oriented</SelectItem>
                                    <SelectItem value="output">Output-Oriented</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rts">Returns to Scale</Label>
                             <Select value={returnsToScale} onValueChange={(v) => setReturnsToScale(v as any)}>
                                <SelectTrigger id="rts"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="crs">Constant (CRS)</SelectItem>
                                    <SelectItem value="vrs">Variable (VRS)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Input Variables ({inputCols.length} selected)</Label>
                            <ScrollArea className="h-24 p-3 border rounded-md bg-muted/30">
                                <div className="space-y-2">
                                    {availableCols.map(h => (
                                        <div key={`in-${h}`} className="flex items-center space-x-2">
                                            <Checkbox id={`in-${h}`} checked={inputCols.includes(h)} onCheckedChange={(c) => handleVarChange(h, c as boolean, 'input')} />
                                            <Label htmlFor={`in-${h}`} className="text-sm font-normal cursor-pointer">{h}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                        <div className="space-y-2">
                            <Label>Output Variables ({outputCols.length} selected)</Label>
                            <ScrollArea className="h-24 p-3 border rounded-md bg-muted/30">
                                <div className="space-y-2">
                                     {availableCols.map(h => (
                                        <div key={`out-${h}`} className="flex items-center space-x-2">
                                            <Checkbox id={`out-${h}`} checked={outputCols.includes(h)} onCheckedChange={(c) => handleVarChange(h, c as boolean, 'output')} />
                                            <Label htmlFor={`out-${h}`} className="text-sm font-normal cursor-pointer">{h}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    
                    {/* Overview component */}
                    <DeaOverview 
                        dmuCol={dmuCol}
                        inputCols={inputCols}
                        outputCols={outputCols}
                        orientation={orientation}
                        returnsToScale={returnsToScale}
                        dataLength={data.length}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {analysisResult && (
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
                    <Button 
                        onClick={handleAnalysis} 
                        disabled={isLoading || !dmuCol || inputCols.length === 0 || outputCols.length === 0}
                    >
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
                        <p className="text-muted-foreground">Running DEA analysis...</p>
                        <Skeleton className="h-[400px] w-full" />
                    </CardContent>
                </Card>
            )}

            {results && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Analysis Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                            <CardDescription>Efficiency frontier identification and benchmarking</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    DEA analysis completed. {results.summary.efficient_dmus} of {results.summary.total_dmus} DMUs are operating on the efficiency frontier.
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
                                        <Award className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Overall Performance</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }}
                                />
                            </div>

                            {/* Model Insights */}
                            {analysisResult.interpretations?.model_insights && analysisResult.interpretations.model_insights.length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-md">
                                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Key Findings</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {analysisResult.interpretations.model_insights.map((insight, idx) => (
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
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.recommendations || '' }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Charts */}
                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                             <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <BarChartIcon className="w-5 h-5" />
                                    Efficiency Distribution
                                </CardTitle>
                                <CardDescription>Number of DMUs in each efficiency tier</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={tierChartConfig} className="w-full h-64">
                                     <ResponsiveContainer>
                                        <RechartsBarChart data={tierData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" width={140} />
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="count" name="DMUs" radius={4}>
                                                {tierData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                        {analysisResult?.plot ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline flex items-center gap-2">
                                        <Target className="w-5 h-5" />
                                        Efficiency Frontier
                                    </CardTitle>
                                    <CardDescription>Visual representation of the efficiency boundary</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <img 
                                        src={analysisResult.plot} 
                                        alt="DEA Frontier Plot" 
                                        className="w-full rounded-md border" 
                                    />
                                </CardContent>
                            </Card>
                        ) : ioChartData.length > 0 && results.input_cols.length > 0 && results.output_cols.length > 0 && (
                             <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Input/Output Comparison</CardTitle>
                                    <CardDescription>First input and output variables</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="w-full h-[400px]">
                                        <ResponsiveContainer>
                                            <RechartsBarChart data={ioChartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80}/>
                                                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Bar yAxisId="left" dataKey={results.input_cols[0]} fill="#8884d8" name={`Input: ${results.input_cols[0]}`} />
                                                <Bar yAxisId="right" dataKey={results.output_cols[0]} fill="#82ca9d" name={`Output: ${results.output_cols[0]}`} />
                                            </RechartsBarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    
                    {/* Detailed Results Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Detailed Efficiency Results</CardTitle>
                            <CardDescription>
                                Efficiency scores and peer groups for each DMU
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{results.dmu_col}</TableHead>
                                            <TableHead className="text-right">Efficiency Score</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                            <TableHead>Reference Set (Peer Group)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.efficiency_scores).sort(([, a], [, b]) => b - a).map(([dmu, score]) => {
                                            const isEfficient = score >= 1;
                                            return (
                                                <TableRow key={dmu}>
                                                    <TableCell className="font-medium">{dmu}</TableCell>
                                                    <TableCell className="font-mono text-right">{score.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right">
                                                        {isEfficient ? (
                                                            <Badge variant="default">Efficient</Badge>
                                                        ) : score >= 0.9 ? (
                                                            <Badge variant="secondary">Mostly Efficient</Badge>
                                                        ) : score >= 0.8 ? (
                                                            <Badge variant="outline">Needs Improvement</Badge>
                                                        ) : (
                                                            <Badge variant="destructive">Inefficient</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {score < 1 && results.reference_sets[dmu] && results.reference_sets[dmu].map((ref, i) => {
                                                          const lambdaVal = results.lambdas[dmu]?.[results.dmu_names.indexOf(ref)];
                                                          return (
                                                            <Badge key={i} variant="secondary" className="mr-1 text-xs">
                                                                {ref} {lambdaVal ? `(${(lambdaVal * 100).toFixed(0)}%)` : ''}
                                                            </Badge>
                                                          )
                                                        })}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                    
                    {/* Improvement Potential */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Improvement Potential</CardTitle>
                            <CardDescription>
                                For inefficient units, specific targets to reach the efficiency frontier
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                {results.improvement_potential.map(item => (
                                    <div key={item.dmu} className="mb-4 p-4 border rounded-md bg-muted/30">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-lg">{item.dmu}</h4>
                                            <Badge variant="outline" className="text-base">
                                                Score: {item.score.toFixed(3)}
                                            </Badge>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Variable</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead className="text-right">Actual</TableHead>
                                                    <TableHead className="text-right">Target</TableHead>
                                                    <TableHead className="text-right">Improvement</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {item.targets.map(t => (
                                                    <TableRow key={t.name}>
                                                        <TableCell>{t.name}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={t.type === 'input' ? 'destructive' : 'default'}>
                                                                {t.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">{t.actual.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono font-semibold">{t.target.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono text-green-600 dark:text-green-400 font-semibold">
                                                            {t.improvement_pct > 0 ? `${t.type === 'input' ? '-' : '+'}${t.improvement_pct.toFixed(1)}%` : '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                    
                    {/* Input & Output Data */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Input & Output Data</CardTitle>
                            <CardDescription>Raw data for all DMUs</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-72">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{dmuCol}</TableHead>
                                            {inputCols.map(c => <TableHead key={c} className="text-right">{c} (Input)</TableHead>)}
                                            {outputCols.map(c => <TableHead key={c} className="text-right">{c} (Output)</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{row[dmuCol!]}</TableCell>
                                                {inputCols.map(c => <TableCell key={c} className="text-right font-mono">{row[c]}</TableCell>)}
                                                {outputCols.map(c => <TableCell key={c} className="text-right font-mono">{row[c]}</TableCell>)}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <BarChartIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Configure variables and click &apos;Run Analysis&apos; to perform DEA.</p>
                </div>
            )}
        </div>
    );
}

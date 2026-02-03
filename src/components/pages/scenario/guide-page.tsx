'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    FlaskConical, Target, Layers, HelpCircle, CheckCircle, Users, TrendingUp,
    Activity, DollarSign, BarChart3, Landmark, Megaphone, Package, Database, Play,
    Settings2, ShieldCheck, Sigma, Variable, Lightbulb, Wand2, FileSearch, FileText,
    GitCompare, Scale, ClipboardList, Briefcase, Heart, ArrowRight,
    CheckCircle2, Sparkles, Info, ListChecks, Upload, Settings, FileBarChart
} from 'lucide-react';
import { type ExampleDataSet, exampleDatasets } from '@/lib/example-datasets';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================
// 시나리오 분석의 핵심 특징 정의
// ============================================================
const SCENARIO_FEATURES = [
    {
        id: 'question-driven',
        icon: HelpCircle,
        label: 'Question-Driven Approach',
        description: 'Start with a business question, not a statistical method. Select your domain scenario and get analysis designed for that context.'
    },
    {
        id: 'pre-designed',
        icon: Layers,
        label: 'Pre-Designed Analysis Pipeline',
        description: 'Each scenario includes domain-specific metrics, visualizations, and interpretations—already configured by experts.'
    },
    {
        id: 'domain-specific',
        icon: Briefcase,
        label: 'Domain-Specific Metrics',
        description: 'HR uses Engagement Index & Favorable%. Finance uses Compa-ratio & Pay Gap. Each field gets its own language.'
    },
    {
        id: 'no-stats-needed',
        icon: CheckCircle,
        label: 'No Statistics Knowledge Required',
        description: 'You don\'t need to know T-tests or ANOVA. Just understand your domain—the analysis is already built for you.'
    },
];

// ============================================================
// 상위 3단계 워크플로우
// ============================================================
const WORKFLOW_STEPS = [
    { 
        id: 1, 
        icon: ListChecks, 
        label: 'Select Scenario', 
        description: 'Choose a pre-built scenario that matches your business question from the sidebar (e.g., "Employee Engagement Survey", "Compensation Analysis").' 
    },
    { 
        id: 2, 
        icon: Database, 
        label: 'Prepare Data', 
        description: 'Upload your dataset or load sample data. The system validates that your data has the required columns for the chosen scenario.' 
    },
    { 
        id: 3, 
        icon: Play, 
        label: 'Run Analysis', 
        description: 'Execute the analysis through a guided 6-step process: Intro → Config → Validation → Summary → Why → Report.' 
    },
];

// ============================================================
// Run Analysis 내부 6단계
// ============================================================
const RUN_ANALYSIS_STEPS = [
    {
        id: 1,
        icon: Info,
        label: 'Intro',
        description: 'Learn about the analysis type, its purpose, and when to use it. Review requirements and expected outputs.',
        visual: 'intro'
    },
    {
        id: 2,
        icon: Settings,
        label: 'Config',
        description: 'Configure analysis parameters: select variables, set grouping columns, define benchmarks, and adjust settings.',
        visual: 'config'
    },
    {
        id: 3,
        icon: ShieldCheck,
        label: 'Validation',
        description: 'The system checks data quality, sample sizes, required columns, and statistical assumptions before running.',
        visual: 'validation'
    },
    {
        id: 4,
        icon: FileSearch,
        label: 'Summary',
        description: 'Review key findings with metrics, visualizations, and a business-friendly summary of the main results.',
        visual: 'summary'
    },
    {
        id: 5,
        icon: Lightbulb,
        label: 'Why',
        description: 'Understand the statistical reasoning behind the results and receive actionable recommendations.',
        visual: 'why'
    },
    {
        id: 6,
        icon: FileBarChart,
        label: 'Report',
        description: 'Access the full report with all statistics, visualizations, and export options (CSV, PNG downloads).',
        visual: 'report'
    }
];

// ============================================================
// 산업별 활용 사례 정의
// ============================================================
const industryApplications = [
    {
        industry: 'Human Resources (HR)',
        icon: Users,
        applications: [
            { scenario: 'Employee Engagement Survey', use: 'Measure engagement index, identify strengths/weaknesses, compare across departments.' },
            { scenario: 'Compensation Analysis', use: 'Detect pay gaps by gender, level, or department with statistical significance testing.' },
            { scenario: 'Attrition Prediction', use: 'Identify key drivers of turnover and predict at-risk employees.' },
            { scenario: 'Training ROI Analysis', use: 'Evaluate pre/post training impact on performance metrics.' },
        ]
    },
    {
        industry: 'Marketing & Customer',
        icon: Megaphone,
        applications: [
            { scenario: 'Campaign Effectiveness', use: 'Measure the causal impact of marketing campaigns using DID or A/B testing.' },
            { scenario: 'Customer Segmentation', use: 'Automatically cluster customers based on behavior and demographics.' },
            { scenario: 'Marketing Mix Modeling', use: 'Optimize budget allocation across marketing channels.' },
            { scenario: 'LTV Prediction', use: 'Forecast customer lifetime value for targeting and retention.' },
        ]
    },
    {
        industry: 'Finance & Risk',
        icon: Landmark,
        applications: [
            { scenario: 'Portfolio Optimization', use: 'Construct optimal portfolios balancing risk and return.' },
            { scenario: 'Value at Risk (VaR)', use: 'Estimate potential losses in investment portfolios.' },
            { scenario: 'Credit Risk Scoring', use: 'Predict default probability and assess creditworthiness.' },
            { scenario: 'Anomaly Detection', use: 'Identify unusual patterns and potential fraud.' },
        ]
    },
    {
        industry: 'Product & Operations',
        icon: Package,
        applications: [
            { scenario: 'Cohort Analysis', use: 'Track user behavior and retention across cohorts over time.' },
            { scenario: 'Funnel Analysis', use: 'Identify drop-off points and conversion bottlenecks.' },
            { scenario: 'Process Mining', use: 'Discover and optimize business process flows.' },
            { scenario: 'Inventory Optimization', use: 'Balance stock levels against demand forecasts.' },
        ]
    },
];

// ============================================================
// Visual Step 컴포넌트 - 6단계 각각의 시각화 (컴팩트 버전)
// ============================================================
const VisualStep = ({ step }: { step: typeof RUN_ANALYSIS_STEPS[0] }) => {
    switch (step.visual) {
        case 'intro':
            return (
                <div className="w-full max-w-xs space-y-2">
                    <div className="p-3 bg-white rounded-md border shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <ClipboardList className="w-5 h-5 text-primary" />
                            <p className="font-medium text-sm">Employee Engagement Survey</p>
                        </div>
                        <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                <span>Likert scale survey data</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                <span>At least 2 survey questions</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                <span>Minimum 5 responses</span>
                            </div>
                        </div>
                    </div>
                </div>
            );

        case 'config':
            return (
                <div className="w-full max-w-xs space-y-2">
                    <div className="p-2 bg-white rounded-md border shadow-sm flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Survey Questions</span>
                        <span className="text-xs font-medium">8 selected</span>
                    </div>
                    <div className="p-2 bg-white rounded-md border shadow-sm flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Department</span>
                        <span className="text-xs font-medium">department</span>
                    </div>
                    <div className="p-2 bg-white rounded-md border shadow-sm flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Benchmark</span>
                        <span className="text-xs font-medium">3.5 / 5.0</span>
                    </div>
                </div>
            );

        case 'validation':
            return (
                <div className="w-full max-w-xs space-y-2">
                    <div className="p-2 bg-white rounded-md border shadow-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <div>
                            <p className="text-xs font-medium">Data Loaded</p>
                            <p className="text-xs text-muted-foreground">250 responses</p>
                        </div>
                    </div>
                    <div className="p-2 bg-white rounded-md border shadow-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <div>
                            <p className="text-xs font-medium">Questions Selected</p>
                            <p className="text-xs text-muted-foreground">8 questions</p>
                        </div>
                    </div>
                    <div className="p-2 bg-white rounded-md border shadow-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <div>
                            <p className="text-xs font-medium">Benchmark Valid</p>
                            <p className="text-xs text-muted-foreground">3.5 / 5.0</p>
                        </div>
                    </div>
                </div>
            );

        case 'summary':
            return (
                <div className="w-full max-w-xs p-4 bg-white rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">Key Findings</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="text-center p-2 bg-primary/5 rounded border border-primary/20">
                            <p className="text-lg font-bold text-primary">72.4%</p>
                            <p className="text-xs text-muted-foreground">Engagement</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                            <p className="text-lg font-bold">3.62</p>
                            <p className="text-xs text-muted-foreground">Avg Score</p>
                        </div>
                    </div>
                    <div className="text-xs p-2 bg-green-50 rounded border border-green-200">
                        <strong>Team Collaboration</strong> is top strength (85% favorable)
                    </div>
                </div>
            );

        case 'why':
            return (
                <div className="w-full max-w-xs p-4 bg-white rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">Recommendations</span>
                    </div>
                    <ul className="text-xs space-y-2 text-muted-foreground">
                        <li className="flex gap-2">
                            <span className="text-primary font-bold">1.</span>
                            Work-Life Balance 15% below benchmark
                        </li>
                        <li className="flex gap-2">
                            <span className="text-primary font-bold">2.</span>
                            Engineering has highest engagement
                        </li>
                        <li className="flex gap-2">
                            <span className="text-primary font-bold">3.</span>
                            Compensation correlates with retention
                        </li>
                    </ul>
                </div>
            );

        case 'report':
            return (
                <div className="w-full max-w-xs space-y-2">
                    <div className="bg-white rounded-md border shadow-sm overflow-hidden">
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="py-1 px-2">Question</TableHead>
                                    <TableHead className="py-1 px-2">Mean</TableHead>
                                    <TableHead className="py-1 px-2">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow><TableCell className="py-1 px-2">Leadership</TableCell><TableCell className="py-1 px-2">3.8</TableCell><TableCell className="py-1 px-2"><Badge className="text-[10px] bg-green-500 px-1">Above</Badge></TableCell></TableRow>
                                <TableRow><TableCell className="py-1 px-2">Work-Life</TableCell><TableCell className="py-1 px-2">3.1</TableCell><TableCell className="py-1 px-2"><Badge className="text-[10px] bg-amber-500 px-1">Below</Badge></TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex gap-2 justify-center">
                        <Badge variant="outline" className="text-[10px]">CSV</Badge>
                        <Badge variant="outline" className="text-[10px]">PNG</Badge>
                    </div>
                </div>
            );

        default:
            return null;
    }
};

// ============================================================
// Feature Visual 컴포넌트 - 특징 시각화
// ============================================================
const FeatureVisual = ({ featureId }: { featureId: string }) => {
    switch (featureId) {
        case 'question-driven':
            return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
                    <HelpCircle className="w-16 h-16 text-primary mb-4" />
                    <p className="text-sm font-medium mb-2">"Is our pay structure equitable?"</p>
                    <ArrowRight className="w-6 h-6 text-muted-foreground my-2" />
                    <Badge variant="outline" className="text-base">Compensation Analysis</Badge>
                </motion.div>
            );
        case 'pre-designed':
            return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
                    <Layers className="w-16 h-16 text-primary mb-4" />
                    <div className="space-y-2 text-center">
                        <p className="text-xs text-muted-foreground mb-2">Pre-configured for each domain:</p>
                        <Badge variant="outline" className="text-sm">Metrics</Badge>
                        <Badge variant="outline" className="text-sm">Visualizations</Badge>
                        <Badge variant="outline" className="text-sm">Interpretations</Badge>
                    </div>
                </motion.div>
            );
        case 'domain-specific':
            return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs space-y-2">
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <span className="text-sm">HR</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Engagement Index, Favorable%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-primary" />
                            <span className="text-sm">Finance</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Compa-ratio, Pay Gap</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-2">
                            <Megaphone className="w-4 h-4 text-primary" />
                            <span className="text-sm">Marketing</span>
                        </div>
                        <span className="text-xs text-muted-foreground">LTV, Cohort Retention</span>
                    </div>
                </motion.div>
            );
        case 'no-stats-needed':
            return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
                    <CheckCircle className="w-16 h-16 text-primary mb-4" />
                    <div className="space-y-2">
                        <p className="text-sm line-through text-muted-foreground">T-Test, ANOVA, Regression...</p>
                        <ArrowRight className="w-5 h-5 mx-auto text-muted-foreground" />
                        <p className="text-sm font-medium text-primary">Just select your scenario!</p>
                    </div>
                </motion.div>
            );
        default:
            return null;
    }
};

// ============================================================
// 메인 컴포넌트
// ============================================================
export default function ScenarioGuidePage({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) {
    const [activeFeature, setActiveFeature] = useState(SCENARIO_FEATURES[0].id);
    const effectivenessExample = exampleDatasets.find(ex => ex.id === 'effectiveness-analysis');

    return (
        <div className="space-y-6">
            <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview & Features</TabsTrigger>
                    <TabsTrigger value="procedure">Analysis Procedure</TabsTrigger>
                    <TabsTrigger value="byIndustry">Use Cases by Field</TabsTrigger>
                </TabsList>

                {/* ============================================================ */}
                {/* Tab 1: Overview & Features */}
                {/* ============================================================ */}
                <TabsContent value="overview">
                    <Card>
                        <CardHeader>
                            <CardTitle>What is Scenario Analysis?</CardTitle>
                            <CardDescription>
                                Scenario Analysis provides pre-designed analysis pipelines for specific business domains. 
                                Instead of learning T-Tests, ANOVA, or Regression, you simply select a scenario for your field 
                                (HR, Marketing, Finance, etc.) and get domain-appropriate metrics, visualizations, and interpretations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {/* Comparison: Traditional vs Scenario */}
                            <div className="grid md:grid-cols-3 gap-6 items-start">
                                <Card className="flex flex-col items-center text-center">
                                    <CardHeader>
                                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 mx-auto">
                                            <HelpCircle className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <CardTitle className="text-lg">1. Your Question</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground italic">"How engaged are our employees?"</p>
                                    </CardContent>
                                </Card>

                                <Card className="flex flex-col items-center text-center border-2 border-primary/30 bg-primary/5">
                                    <CardHeader>
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                                            <Layers className="w-8 h-8 text-primary" />
                                        </div>
                                        <CardTitle className="text-lg">2. Pre-Designed Analysis</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <p className="text-sm text-muted-foreground mb-3">Domain-specific metrics included:</p>
                                        <Badge variant="outline" className="text-sm">Engagement Index</Badge>
                                        <Badge variant="outline" className="text-sm">Favorable %</Badge>
                                        <Badge variant="outline" className="text-sm">Department Comparison</Badge>
                                    </CardContent>
                                </Card>

                                <Card className="flex flex-col items-center text-center">
                                    <CardHeader>
                                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 mx-auto">
                                            <FileText className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <CardTitle className="text-lg">3. Domain-Ready Report</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground italic">"Engagement is 72% (Moderate). Work-Life Balance needs attention in Operations."</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Key Features Section */}
                            <div className="pt-8 border-t">
                                <h3 className="text-xl font-bold mb-6">Key Features</h3>
                                <div className="grid md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_400px] gap-8 items-center">
                                    <div className="relative w-full h-[300px] overflow-hidden bg-slate-100 rounded-lg flex items-center justify-center">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={activeFeature}
                                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                                                transition={{ duration: 0.35, ease: 'easeInOut' }}
                                                className="absolute inset-0 flex flex-col items-center justify-center p-6"
                                            >
                                                <FeatureVisual featureId={activeFeature} />
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {SCENARIO_FEATURES.map(feature => (
                                            <button
                                                key={feature.id}
                                                onMouseEnter={() => setActiveFeature(feature.id)}
                                                className={cn(
                                                    "p-4 rounded-lg text-left transition-all duration-300 border-2",
                                                    activeFeature === feature.id
                                                        ? 'bg-primary/10 border-primary/30 shadow-lg'
                                                        : 'bg-white hover:bg-slate-50 border-transparent'
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "p-2 rounded-md transition-colors",
                                                        activeFeature === feature.id ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600'
                                                    )}>
                                                        <feature.icon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold">{feature.label}</h4>
                                                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ============================================================ */}
                {/* Tab 2: Analysis Procedure */}
                {/* ============================================================ */}
                <TabsContent value="procedure">
                    <Card>
                        <CardHeader>
                            <CardTitle>Standard Analysis Procedure</CardTitle>
                            <CardDescription>
                                Our platform follows a structured, step-by-step process to guide you from data to insight.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {/* 상위 3단계 Workflow */}
                            <div>
                                <h3 className="text-lg font-bold mb-4">Workflow Overview</h3>
                                <div className="space-y-6">
                                    {WORKFLOW_STEPS.map((step, index) => (
                                        <div key={step.id} className="grid md:grid-cols-[auto,1fr] gap-6 items-start">
                                            <div className="flex flex-col items-center">
                                                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                                                    {step.id}
                                                </div>
                                                {index < WORKFLOW_STEPS.length - 1 && (
                                                    <div className="w-0.5 flex-1 bg-border mt-2 min-h-[40px]"></div>
                                                )}
                                            </div>
                                            <div className="space-y-2 pt-1">
                                                <h4 className="font-semibold text-lg flex items-center gap-2">
                                                    <step.icon className="w-5 h-5 text-primary" />
                                                    {step.label}
                                                </h4>
                                                <p className="text-muted-foreground">{step.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 6단계 Run Analysis */}
                            <div className="pt-8 border-t">
                                <h3 className="text-xl font-bold text-center mb-8">Inside "Run Analysis" - 6 Steps</h3>
                                <div className="space-y-8">
                                    {RUN_ANALYSIS_STEPS.map((step, index) => (
                                        <div key={step.id} className="grid md:grid-cols-2 gap-8 items-center">
                                            {/* Text Side */}
                                            <div className={`space-y-4 ${index % 2 === 0 ? 'md:order-1' : 'md:order-2'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold flex-shrink-0 border-2 border-primary/20">
                                                        <step.icon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-primary uppercase">STEP {step.id}</p>
                                                        <h4 className="font-bold text-xl">{step.label}</h4>
                                                    </div>
                                                </div>
                                                <p className="text-muted-foreground">{step.description}</p>
                                            </div>

                                            {/* Visual Side */}
                                            <div className={`${index % 2 === 0 ? 'md:order-2' : 'md:order-1'}`}>
                                                <Card className="overflow-hidden">
                                                    <CardContent className="p-0">
                                                        <div className="bg-muted min-h-[280px] rounded-lg flex items-center justify-center p-6">
                                                            <VisualStep step={step} />
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ============================================================ */}
                {/* Tab 3: Use Cases by Industry */}
                {/* ============================================================ */}
                <TabsContent value="byIndustry">
                    <Card>
                        <CardHeader>
                            <CardTitle>Scenario Analysis by Field</CardTitle>
                            <CardDescription>
                                Discover pre-built scenarios designed for your industry's unique analytical needs.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {industryApplications.map(industry => {
                                const Icon = industry.icon;
                                return (
                                    <div key={industry.industry}>
                                        <h3 className="text-2xl font-bold font-headline mb-4 flex items-center gap-3">
                                            <Icon className="w-7 h-7 text-primary" />
                                            {industry.industry}
                                        </h3>
                                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {industry.applications.map(app => (
                                                <Card key={app.scenario} className="flex flex-col">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-base">{app.scenario}</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="flex-1">
                                                        <p className="text-sm text-muted-foreground">{app.use}</p>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* CTA Button */}
            <div className="text-center pt-8">
                {effectivenessExample && (
                    <Button onClick={() => onLoadExample(effectivenessExample)} size="lg">
                        <FlaskConical className="mr-2 h-5 w-5" />
                        Load Example & Get Started
                    </Button>
                )}
            </div>
        </div>
    );
}


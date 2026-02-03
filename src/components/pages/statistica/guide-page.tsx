'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sigma, BarChart, Users, CheckSquare, TrendingUp, Network, Target, Scaling,
  LineChart, Layers, Variable, BookOpen, Settings2, ShieldCheck, Search,
  Lightbulb, CheckCircle2, Sparkles, FileSearch, HelpCircle, ArrowRight,
  Calculator, Sliders, FileText, GitCompare, TestTube, BarChart3, PieChart
} from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// ============================================================
// 분석 방법 목록 (By Categories용)
// ============================================================
const analysisMethods = [
    { category: 'Descriptive', method: 'Descriptive Statistics', purpose: 'Summarizes data using mean, SD, min, max, etc.', useCase: 'Summarizing survey responses, initial data overview' },
    { category: 'Descriptive', method: 'Frequency Analysis', purpose: 'Calculates counts and percentages for each category', useCase: 'Showing response rates in Likert scale surveys' },
    { category: 'Assumptions', method: 'Normality Test', purpose: 'Tests whether data follow a normal distribution', useCase: 'Pre-check for t-test or ANOVA' },
    { category: 'Assumptions', method: 'Homogeneity of Variance', purpose: 'Tests if variances are equal across groups', useCase: 'Assumption check before ANOVA' },
    { category: 'Comparison', method: 'T-Tests (One-Sample)', purpose: 'Compares sample mean to a population mean', useCase: 'Assessing overall satisfaction level' },
    { category: 'Comparison', method: 'Independent Samples T-Test', purpose: 'Compares means between two independent groups', useCase: 'Comparing satisfaction between male/female respondents' },
    { category: 'Comparison', method: 'Paired Samples T-Test', purpose: 'Compares means within the same group over time', useCase: 'Pre- vs. post-training evaluation' },
    { category: 'Comparison', method: 'One-Way ANOVA', purpose: 'Compares means among three or more groups', useCase: 'Comparing satisfaction by age group' },
    { category: 'Comparison', method: 'Two-Way ANOVA', purpose: 'Tests interaction effects between two factors', useCase: 'Gender × Age interaction effects' },
    { category: 'Comparison', method: 'ANCOVA', purpose: 'Controls covariates while comparing group means', useCase: 'Adjusting for education level or time spent' },
    { category: 'Comparison', method: 'MANOVA', purpose: 'Compares multiple dependent variables simultaneously', useCase: 'Analyzing multiple satisfaction dimensions' },
    { category: 'Comparison', method: 'Repeated Measures ANOVA', purpose: 'Analyzes repeated measurements within subjects', useCase: 'Measuring changes across time or conditions' },
    { category: 'Relationship', method: 'Correlation', purpose: 'Measures strength and direction of relationships', useCase: 'Relationship between satisfaction and repurchase' },
    { category: 'Relationship', method: 'Simple Linear Regression', purpose: 'Predicts one variable using another', useCase: 'Effect of price on satisfaction' },
    { category: 'Relationship', method: 'Multiple Linear Regression', purpose: 'Predicts outcome using multiple predictors', useCase: 'Impact of quality, price, and service on satisfaction' },
    { category: 'Relationship', method: 'Polynomial Regression', purpose: 'Models nonlinear relationships', useCase: 'Curvilinear relationship between price and satisfaction' },
    { category: 'Relationship', method: 'Logistic Regression', purpose: 'Predicts categorical outcomes (e.g., yes/no)', useCase: 'Purchase decision prediction' },
    { category: 'Relationship', method: 'Crosstab & Chi-Squared Test', purpose: 'Tests independence between categorical variables', useCase: 'Gender differences in brand preference' },
    { category: 'Predictive', method: 'Generalized Linear Model (GLM)', purpose: 'Extends regression to non-normal distributions', useCase: 'Poisson, logistic, or gamma regression models' },
    { category: 'Predictive', method: 'Discriminant Analysis', purpose: 'Classifies cases into predefined groups', useCase: 'Customer segmentation, churn prediction' },
    { category: 'Predictive', method: 'Survival Analysis', purpose: 'Analyzes time-to-event data', useCase: 'Customer churn analysis, product failure time' },
    { category: 'Structural', method: 'Factor Analysis', purpose: 'Identifies latent factors from correlated items', useCase: 'Reducing survey dimensions' },
    { category: 'Structural', method: "Reliability (Cronbach's α)", purpose: 'Tests internal consistency among items', useCase: 'Reliability check for survey scales' },
    { category: 'Structural', method: 'Exploratory Factor Analysis (EFA)', purpose: 'Explores underlying factor structure', useCase: 'Identifying satisfaction dimensions' },
    { category: 'Structural', method: 'Path Analysis', purpose: 'Tests direct and indirect relationships', useCase: 'Service → Satisfaction → Loyalty' },
    { category: 'Structural', method: 'Mediation Analysis', purpose: 'Tests indirect (mediating) effects', useCase: 'Satisfaction mediating the effect of quality on loyalty' },
    { category: 'Structural', method: 'Moderation Analysis', purpose: 'Tests interaction (moderating) effects', useCase: 'Gender moderating the quality–satisfaction link' },
    { category: 'Clustering', method: 'K-Means', purpose: 'Groups cases based on similarity (centroid-based)', useCase: 'Customer segmentation' },
    { category: 'Clustering', method: 'K-Medoids', purpose: 'Similar to K-Means but more robust to outliers', useCase: 'Clustering noisy or non-numeric data' },
    { category: 'Clustering', method: 'Hierarchical (HCA)', purpose: 'Builds nested clusters in a tree-like structure', useCase: 'Visualizing customer hierarchy (dendrogram)' },
    { category: 'Clustering', method: 'DBSCAN / HDBSCAN', purpose: 'Density-based clustering that handles noise', useCase: 'Finding natural clusters in large datasets' },
    { category: 'Time Series', method: 'Trend Analysis', purpose: 'Detects upward or downward patterns over time', useCase: 'Sales or traffic trend analysis' },
    { category: 'Time Series', method: 'Seasonal Decomposition', purpose: 'Decomposes time series into trend, seasonal, residual components', useCase: 'Identifying seasonal buying patterns' },
    { category: 'Time Series', method: 'ACF/PACF Plots', purpose: 'Examines autocorrelation patterns', useCase: 'Selecting ARIMA model parameters' },
    { category: 'Time Series', method: 'Stationarity Test (ADF)', purpose: 'Tests whether a time series is stationary', useCase: 'Preprocessing for forecasting models' },
    { category: 'Time Series', method: 'Ljung–Box / ARCH-LM Test', purpose: 'Tests residual independence or heteroskedasticity', useCase: 'Model adequacy diagnostics' },
    { category: 'Time Series', method: 'Exponential Smoothing', purpose: 'Short-term forecasting using weighted averages', useCase: 'Simple forecast for demand or visits' },
    { category: 'Time Series', method: 'ARIMA / SARIMAX', purpose: 'Advanced time-series forecasting models', useCase: 'Monthly sales or traffic prediction' },
    { category: 'Time Series', method: 'Forecast Model Evaluation', purpose: 'Compares prediction accuracy (RMSE, MAE, etc.)', useCase: 'Model performance comparison' },
    { category: 'Unstructured Data', method: 'Sentiment Analysis', purpose: 'Classifies text polarity (positive/negative/neutral)', useCase: 'Product review sentiment tracking' },
    { category: 'Unstructured Data', method: 'Topic Modeling (LDA)', purpose: 'Identifies underlying topics from text', useCase: 'Extracting key themes from open-ended survey responses' },
    { category: 'Unstructured Data', method: 'Word Cloud', purpose: 'Visualizes most frequent words', useCase: 'Highlighting main keywords in feedback' },
];

const groupedMethods = analysisMethods.reduce((acc, method) => {
    if (!acc[method.category]) {
        acc[method.category] = [];
    }
    acc[method.category].push(method);
    return acc;
}, {} as Record<string, typeof analysisMethods>);

// ============================================================
// 통계 분석의 핵심 특징 정의
// ============================================================
const STATISTICA_FEATURES = [
    {
        id: 'method-based',
        icon: Calculator,
        label: 'Method-Based Selection',
        description: 'Choose the exact statistical method you need: T-Test, ANOVA, Regression, and more.'
    },
    {
        id: 'assumption-check',
        icon: ShieldCheck,
        label: 'Built-in Assumption Checks',
        description: 'Automatically validates normality, homogeneity, and other assumptions before running tests.'
    },
    {
        id: 'flexible-config',
        icon: Sliders,
        label: 'Flexible Configuration',
        description: 'Customize alpha levels, post-hoc tests, confidence intervals, and other parameters.'
    },
    {
        id: 'full-output',
        icon: FileText,
        label: 'Complete Statistical Output',
        description: 'Get full tables, coefficients, p-values, effect sizes, and publication-ready visualizations.'
    },
];

// ============================================================
// 상위 3단계 워크플로우
// ============================================================
const WORKFLOW_STEPS = [
    {
        id: 1,
        icon: Search,
        label: 'Select Analysis',
        description: 'Choose your desired statistical method from the sidebar (e.g., T-Test, ANOVA, Regression, Clustering).'
    },
    {
        id: 2,
        icon: Layers,
        label: 'Prepare Data',
        description: 'Upload your dataset (CSV, Excel, JSON) or select from pre-loaded example datasets.'
    },
    {
        id: 3,
        icon: TestTube,
        label: 'Run Analysis',
        description: 'Configure variables, validate assumptions, and execute the analysis through a guided 6-step process.'
    },
];

// ============================================================
// Run Analysis 내부 6단계
// ============================================================
const RUN_ANALYSIS_STEPS = [
    {
        id: 1,
        icon: Variable,
        label: 'Variables',
        description: 'Select the dependent and independent variables for your analysis.',
        visual: 'variables'
    },
    {
        id: 2,
        icon: Settings2,
        label: 'Settings',
        description: 'Configure model-specific parameters such as alpha levels, post-hoc tests, or confidence intervals.',
        visual: 'settings'
    },
    {
        id: 3,
        icon: ShieldCheck,
        label: 'Validation',
        description: 'The system checks your data against the statistical assumptions required for the chosen test.',
        visual: 'validation'
    },
    {
        id: 4,
        icon: FileSearch,
        label: 'Summary',
        description: 'Review a high-level, business-friendly summary of the key findings.',
        visual: 'summary'
    },
    {
        id: 5,
        icon: Lightbulb,
        label: 'Reasoning',
        description: 'Understand the "why" behind the summary with explanations of the statistical results.',
        visual: 'reasoning'
    },
    {
        id: 6,
        icon: Sigma,
        label: 'Statistics',
        description: 'Dive deep into the full statistical output, including tables and charts.',
        visual: 'statistics'
    }
];

// ============================================================
// Visual Step 컴포넌트 - 6단계 각각의 시각화
// ============================================================
const VisualStep = ({ step }: { step: typeof RUN_ANALYSIS_STEPS[0] }) => {
    switch (step.visual) {
        case 'variables':
            return (
                <div className="w-full max-w-xs space-y-2">
                    <div className="p-3 bg-white rounded-md border shadow-sm">
                        <Label className="text-xs text-muted-foreground">Dependent Variable</Label>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-medium">Satisfaction</span>
                            <Target className="w-4 h-4 text-primary" />
                        </div>
                    </div>
                    <div className="p-3 bg-white rounded-md border shadow-sm">
                        <Label className="text-xs text-muted-foreground">Independent Variables</Label>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-medium">Price, Quality</span>
                            <Users className="w-4 h-4 text-primary" />
                        </div>
                    </div>
                </div>
            );

        case 'settings':
            return (
                <div className="w-full max-w-xs space-y-2">
                    <div className="p-2 bg-white rounded-md border shadow-sm flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Alpha Level</span>
                        <Badge>0.05</Badge>
                    </div>
                    <div className="p-2 bg-white rounded-md border shadow-sm flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Post-hoc Test</span>
                        <Badge variant="outline">Tukey HSD</Badge>
                    </div>
                    <div className="p-2 bg-white rounded-md border shadow-sm flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Confidence</span>
                        <Badge variant="outline">95%</Badge>
                    </div>
                </div>
            );

        case 'validation':
            return (
                <div className="w-full max-w-xs space-y-2">
                    <div className="p-2 bg-white rounded-md border shadow-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <div>
                            <p className="text-xs font-medium">Variables Selected</p>
                            <p className="text-xs text-muted-foreground">3 variable(s)</p>
                        </div>
                    </div>
                    <div className="p-2 bg-white rounded-md border shadow-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <div>
                            <p className="text-xs font-medium">Normality Test</p>
                            <p className="text-xs text-muted-foreground">Passed (p=0.23)</p>
                        </div>
                    </div>
                    <div className="p-2 bg-white rounded-md border shadow-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <div>
                            <p className="text-xs font-medium">No Missing Values</p>
                            <p className="text-xs text-muted-foreground">Complete data</p>
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
                    <div className="p-3 bg-primary/5 rounded border border-primary/20">
                        <p className="text-xs">
                            Both <strong>Price</strong> and <strong>Quality</strong> have a significant positive impact on <strong>Satisfaction</strong>.
                        </p>
                    </div>
                </div>
            );

        case 'reasoning':
            return (
                <div className="w-full max-w-xs p-4 bg-white rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">Why This Conclusion?</span>
                    </div>
                    <ul className="text-xs space-y-2 text-muted-foreground">
                        <li className="flex gap-2">
                            <span className="text-primary font-bold">1.</span>
                            p-values &lt; 0.05 (not random chance)
                        </li>
                        <li className="flex gap-2">
                            <span className="text-primary font-bold">2.</span>
                            R² = 0.65 (65% variance explained)
                        </li>
                    </ul>
                </div>
            );

        case 'statistics':
            return (
                <div className="w-full max-w-xs space-y-2">
                    <div className="bg-white rounded-md border shadow-sm overflow-hidden">
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="py-1 px-2">Variable</TableHead>
                                    <TableHead className="py-1 px-2">Coef</TableHead>
                                    <TableHead className="py-1 px-2">p-value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="py-1 px-2">Price</TableCell>
                                    <TableCell className="py-1 px-2">0.45</TableCell>
                                    <TableCell className="py-1 px-2">&lt;0.001</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="py-1 px-2">Quality</TableCell>
                                    <TableCell className="py-1 px-2">0.62</TableCell>
                                    <TableCell className="py-1 px-2">&lt;0.001</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex gap-2 justify-center">
                        <Badge variant="outline" className="text-[10px]">R² = 0.65</Badge>
                        <Badge variant="outline" className="text-[10px]">F = 45.2</Badge>
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
        case 'method-based':
            return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
                    <Calculator className="w-16 h-16 text-primary mb-4" />
                    <div className="space-y-2">
                        <Badge variant="outline" className="text-sm">T-Test</Badge>
                        <Badge variant="outline" className="text-sm">ANOVA</Badge>
                        <Badge variant="outline" className="text-sm">Regression</Badge>
                    </div>
                </motion.div>
            );
        case 'assumption-check':
            return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Normality Test</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Homogeneity of Variance</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Independence</span>
                    </div>
                </motion.div>
            );
        case 'flexible-config':
            return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
                    <Sliders className="w-16 h-16 text-primary mb-4" />
                    <div className="space-y-1 text-center">
                        <p className="text-xs text-muted-foreground">Alpha: 0.01 / 0.05 / 0.10</p>
                        <p className="text-xs text-muted-foreground">Post-hoc: Tukey, Bonferroni, Scheffé</p>
                        <p className="text-xs text-muted-foreground">CI: 90% / 95% / 99%</p>
                    </div>
                </motion.div>
            );
        case 'full-output':
            return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
                    <BarChart3 className="w-12 h-12 text-primary" />
                    <LineChart className="w-12 h-12 text-green-500" />
                    <PieChart className="w-12 h-12 text-amber-500" />
                </motion.div>
            );
        default:
            return null;
    }
};

// ============================================================
// 메인 컴포넌트
// ============================================================
interface GuidePageProps {
    data?: any[];
    allHeaders?: string[];
    numericHeaders?: string[];
    categoricalHeaders?: string[];
    onLoadExample?: (example: any) => void;
    onFileSelected?: (file: File) => void;
    isUploading?: boolean;
    activeAnalysis?: string;
    onAnalysisComplete?: (result: any) => void;
    onGenerateReport?: (analysisType: string, stats: any, viz: string | null) => void;
    fileName?: string;          // ← 이 줄 있는지 확인
    onClearData?: () => void;   // ← 이 줄 있는지 확인
  }

export default function GuidePage(props: GuidePageProps) {
    const [activeFeature, setActiveFeature] = useState(STATISTICA_FEATURES[0].id);

    return (
        <div className="space-y-6">
            <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview & Features</TabsTrigger>
                    <TabsTrigger value="procedure">Analysis Procedure</TabsTrigger>
                    <TabsTrigger value="byCategory">By Categories</TabsTrigger>
                </TabsList>

                {/* ============================================================ */}
                {/* Tab 1: Overview & Features */}
                {/* ============================================================ */}
                <TabsContent value="overview">
                    <Card>
                        <CardHeader>
                            <CardTitle>What is Standard Analysis?</CardTitle>
                            <CardDescription>
                                Standard Analysis provides direct access to individual statistical methods. 
                                You choose the specific test you need (T-Test, ANOVA, Regression, etc.) 
                                and configure it with full control over parameters and assumptions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {/* Comparison: Question vs Method */}
                            <div className="grid md:grid-cols-3 gap-6 items-start">
                                <Card className="flex flex-col items-center text-center">
                                    <CardHeader>
                                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 mx-auto">
                                            <HelpCircle className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <CardTitle className="text-lg">1. Your Question</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground italic">"Do two groups differ significantly?"</p>
                                    </CardContent>
                                </Card>

                                <Card className="flex flex-col items-center text-center border-2 border-primary/30 bg-primary/5">
                                    <CardHeader>
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                                            <Calculator className="w-8 h-8 text-primary" />
                                        </div>
                                        <CardTitle className="text-lg">2. Select Method</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <p className="text-sm text-muted-foreground mb-3">You choose the right test:</p>
                                        <Badge variant="outline" className="text-sm">Independent T-Test</Badge>
                                        <Badge variant="outline" className="text-sm">Mann-Whitney U</Badge>
                                        <Badge variant="outline" className="text-sm">Welch's T-Test</Badge>
                                    </CardContent>
                                </Card>

                                <Card className="flex flex-col items-center text-center">
                                    <CardHeader>
                                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 mx-auto">
                                            <FileText className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <CardTitle className="text-lg">3. Full Statistical Output</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground italic">"t(98)=2.45, p=0.016, Cohen's d=0.49. Group A (M=3.8) &gt; Group B (M=3.2)"</p>
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
                                        {STATISTICA_FEATURES.map(feature => (
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
                                                        <div className="bg-muted min-h-[200px] rounded-lg flex items-center justify-center p-6">
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
                {/* Tab 3: By Categories */}
                {/* ============================================================ */}
                <TabsContent value="byCategory">
                    <Card>
                        <CardHeader>
                            <CardTitle>Analysis Methods by Category</CardTitle>
                            <CardDescription>Find the right statistical method for your research question, grouped by category.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {Object.entries(groupedMethods).map(([category, methods]) => (
                                    <AccordionItem value={category} key={category}>
                                        <AccordionTrigger className="text-lg font-semibold">{category}</AccordionTrigger>
                                        <AccordionContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-1/4">Method</TableHead>
                                                        <TableHead className="w-1/2">Purpose / Description</TableHead>
                                                        <TableHead className="w-1/4">Typical Use Case</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {methods.map((method) => (
                                                        <TableRow key={method.method}>
                                                            <TableCell>{method.method}</TableCell>
                                                            <TableCell>{method.purpose}</TableCell>
                                                            <TableCell>{method.useCase}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}



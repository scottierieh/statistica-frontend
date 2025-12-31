
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
  SidebarGroupLabel,
  SidebarFooter
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  FileText,
  Loader2,
  TrendingUp,
  Landmark,
  Building,
  FastForward,
  PlayCircle,
  BarChart,
  GitBranch,
  Users,
  Waypoints,
  CalendarDays,
  Wand2,
  Sigma,
  TestTube,
  Waves,
  Percent,
  Repeat,
  HeartPulse,
  Shield,
  Component,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Network,
  Columns,
  Sun,
  Target,
  Layers,
  Map,
  Timer,
  ScanSearch,
  Atom,
  MessagesSquare,
  Share2,
  GitCommit,
  DollarSign,
  ThumbsUp,
  ClipboardList,
  Handshake,
  Replace,
  Activity,
  Palette,
  Crosshair,
  FlaskConical,
  Feather,
  Settings2,
  Smile,
  Scaling,
  AreaChart,
  LineChart,
  Car,
  ChevronsUpDown,
  BarChart2,
  Calculator,
  Brain,
  Link2,
  ScatterChart,
  ShieldCheck,
  Scissors,
  FileSearch,
  CheckSquare,
  Clock,
  Filter,
  Download,
  Bot,
  UserX,
  BookOpen,
  Building2,
  Search,
  ArrowLeft,
  Grid,
  SlidersHorizontal,
  Container,
  Award,
  Truck,
  Package,
  FileUp,
  Milestone,
  BarChart3,
  Sparkles,
  HelpCircle,
  Info,
  Lightbulb,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  type DataSet,
  parseData,
  unparseData,
} from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';
import DescriptiveStatisticsPage from './pages/descriptive-stats-page';
import GuidePage from './pages/guide-page';
import RecommendationPage from './pages/recommendation-page';
import FrequencyAnalysisPage from './pages/frequency-analysis-page';
import VariabilityAnalysisPage from './pages/variability-analysis-page';
import NormalityTestPage from './pages/normality-test-page';
import HomogeneityTestPage from './pages/homogeneity-test-page';
import OutlierDetectionPage from './pages/outlier-detection-page';
import LinearityCheckPage from './pages/linearity-check-page';
import AutocorrelationTestPage from './pages/autocorrelation-test-page';
import InfluenceDiagnosticsPage from './pages/influence-diagnostics-page';
import OneSampleTTestPage from './pages/one-sample-ttest-page';
import IndependentSamplesTTestPage from './pages/independent-samples-ttest-page';
import WelchsTTestPage from './pages/welchs-ttest-page';
import PairedSamplesTTestPage from './pages/paired-samples-ttest-page';
import AnovaPage from './pages/anova-page';
import TwoWayAnovaPage from './pages/two-way-anova-page';
import AncovaPage from './pages/ancova-page';
import ManovaPage from './pages/manova-page';
import RepeatedMeasuresAnovaPage from './pages/repeated-measures-anova-page';
import MannwhitneyPage from './pages/mann-whitney-page';
import WilcoxonPage from './pages/wilcoxon-page';
import KruskalPage from './pages/kruskal-page';
import FriedmanPage from './pages/friedman-page';
import PowerAnalysisPage from './pages/power-analysis-page';
import CorrelationPage from './pages/correlation-page';
import CrosstabPage from './pages/crosstab-page';
import RegressionPage from './pages/regression-page';
import LogisticRegressionPage from './pages/logistic-regression-page';
import LassoRegressionPage from './pages/lasso-regression-page';
import RidgeRegressionPage from './pages/ridge-regression-page';
import RobustRegressionPage from './pages/robust-regression-page';
import GlmPage from './pages/glm-page';
import RelativeImportancePage from './pages/relative-importance-page';
import FeatureImportancePage from './pages/feature-importance-page';
import DiscriminantPage from './pages/discriminant-page';
import DecisionTreePage from './pages/decision-tree-page';
import GbmPage from './pages/gbm-page';
import RandomForestPage from './pages/random-forest-page';
import SurvivalAnalysisPage from './pages/survival-analysis-page';
import CrossValidationPage from './pages/cross-validation-page';
import ReliabilityPage from './pages/reliability-page';
import EfaPage from './pages/efa-page';
import PcaPage from './pages/pca-page';
import ReliabilityValidityPage from './pages/reliability-validity-page';
import MediationAnalysisPage from './pages/mediation-analysis-page';
import ModerationAnalysisPage from './pages/moderation-analysis-page';
import SnaPage from './pages/sna-page';
import KMeansPage from './pages/kmeans-page';
import KMedoidsPage from './pages/kmedoids-page';
import DbscanPage from './pages/dbscan-page';
import HdbscanPage from './pages/hdbscan-page';
import HcaPage from './pages/hca-page';
import { getSummaryReport } from '@/app/actions';
import AIInteractionController from './AIInteractionController';
import SentimentAnalysisPage from './pages/sentiment-analysis-page';
import TopicModelingPage from './pages/topic-modeling-page';
import WordCloudPage from './pages/wordcloud-page';
import ScenarioSensitivityPage from './pages/scenario-sensitivity-page';
import WhatIfPage from './pages/what-if-page';
import ThresholdOptimizationPage from './pages/threshold-optimization-page';
import CostSensitivePage from './pages/cost-sensitive-page';
import IpaPage from './pages/ipa-page';
import FunnelPage from './pages/funnel-page';
import NpsPage from './pages/nps-page';
import LtvPage from './pages/ltv-page';
import AssociationPage from './pages/association-rule-page';
import DeaPage from './pages/dea-page';
import RoiAnalysisPage from './pages/roi-analysis-page';
import TurnoverAnalysisPage from './pages/turnover-analysis-page';
import RiskMatrixPage from './pages/risk-matrix-page';
import SatisfactionEngagementMatrixPage from './pages/satisfaction-engagement-matrix-page';
import AttendanceAnalysisPage from './pages/attendance-analysis-page';
import HeadcountStabilityPage from './pages/headcount-stability-page';
import FinancialModelingPage from './pages/financial-modeling-page';
import FactorAnalysisPage from './pages/factor-analysis-page';
import OptionsPricingPage from './pages/options-pricing-page';
import BacktestingPage from './pages/backtesting-page';
import PairsTradingPage from './pages/pairs-trading-page';
import QuantitativeRiskAnalysisPage from './pages/quantitative-risk-analysis-page';
import CreditRiskPage from './pages/credit-risk-page';
import SqcPage from './pages/sqc-page';
import ProcessCapabilityPage from './pages/process-capability-page';
import AttributeControlChartsPage from './pages/attribute-control-charts-page';
import GageRrPage from './pages/gage-rr-page';
import ParetoAnalysisPage from './pages/pareto-analysis-page';
import AcceptanceSamplingPage from './pages/acceptance-sampling-page';
import LinearProgrammingPage from './pages/linear-programming-page';
import NonlinearPage from './pages/nonlinear-programming-page';
import GoalProgrammingPage from './pages/goal-programming-page';
import TransportationProblemPage from './pages/transportation-problem-page';
import VrpTspPage from './pages/vrp-tsp-page';
import EOQOptimizationPage from './pages/eoq-optimization-page';
import InventoryOptimizationPage from './pages/inventory-optimization-page';
import LeadTimeAnalysisPage from './pages/lead-time-analysis-page';
import FleetOptimizationPage from './pages/fleet-optimization-page';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card';

export interface AnalysisPageProps {
  data: DataSet;
  allHeaders: string[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: ExampleDataSet) => void;
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  activeAnalysis: string;
  onAnalysisComplete?: (result: any) => void;
  restoredState?: any;
}


interface AnalysisItem {
    id: string;
    label: string;
    icon: React.ElementType;
    component: React.ComponentType<AnalysisPageProps>;
}

interface AnalysisSubCategory {
    name: string;
    items: AnalysisItem[];
}

interface BaseAnalysisCategory {
    name: string;
    icon: React.ElementType;
}

interface SingleLevelAnalysisCategory extends BaseAnalysisCategory {
    isSingle?: true;
    items: AnalysisItem[];
    subCategories?: undefined;
}

interface MultiLevelAnalysisCategory extends BaseAnalysisCategory {
    isSingle?: false;
    items?: undefined;
    subCategories: AnalysisSubCategory[];
}

type AnalysisCategory = SingleLevelAnalysisCategory | MultiLevelAnalysisCategory;


const analysisCategories: AnalysisCategory[] = [
  {
    name: 'Overview',
    icon: BookOpen,
    isSingle: true,
    items: [
      { id: 'guide', label: 'Overview', icon: BookOpen, component: GuidePage },
    ]
  },
  {
    name: 'Recommendation',
    icon: Wand2,
    isSingle: true,
    items: [
      { id: 'recommendation', label: 'Analysis Recommendation', icon: Wand2, component: RecommendationPage },
    ]
  },
  {
    name: 'Descriptive',
    icon: BarChart,
    items: [
      { id: 'descriptive-stats', label: 'Descriptive Statistics', icon: BarChart, component: DescriptiveStatisticsPage },
      { id: 'frequency-analysis', label: 'Frequency Analysis', icon: Users, component: FrequencyAnalysisPage },
      { id: 'variability-analysis', label: 'Variability Analysis', icon: TrendingUp, component: VariabilityAnalysisPage },
    ],
  },
  {
    name: 'Assumptions',
    icon: CheckSquare,
    items: [
      { id: 'normality-test', label: 'Normality Test', icon: BarChart, component: NormalityTestPage },
      { id: 'homogeneity-test', label: 'Homogeneity of Variance', icon: Layers, component: HomogeneityTestPage },
      { id: 'outlier-detection', label: 'Outlier Detection', icon: AlertTriangle, component: OutlierDetectionPage },
      { id: 'linearity-check', label: 'Linearity Check', icon: ScatterChart, component: LinearityCheckPage },
      { id: 'autocorrelation-test', label: 'Autocorrelation Test', icon: Waves, component: AutocorrelationTestPage },
      { id: 'influence-diagnostics', label: 'Influence Diagnostics', icon: Crosshair, component: InfluenceDiagnosticsPage }
    ],
  },
  {
    name: 'Comparison',
    icon: Users,
    subCategories: [
      {
        name: 'T-Tests',
        items: [
          { id: 'one-sample-ttest', label: 'One-Sample', icon: Target, component: OneSampleTTestPage },
          { id: 'independent-samples-ttest', label: 'Independent Samples', icon: Users, component: IndependentSamplesTTestPage },
          { id: 'welchs-ttest', label: 'Welch\'s T-test', icon: Users, component: WelchsTTestPage },
          { id: 'paired-samples-ttest', label: 'Paired Samples', icon: Repeat, component: PairedSamplesTTestPage },
        ]
      },
      {
        name: 'ANOVA',
        items: [
          { id: 'one-way-anova', label: 'One-Way ANOVA', icon: Users, component: AnovaPage },
          { id: 'two-way-anova', label: 'Two-Way ANOVA', icon: Users, component: TwoWayAnovaPage },
          { id: 'ancova', label: 'Analysis of Covariance (ANCOVA)', icon: Layers, component: AncovaPage },
          { id: 'manova', label: 'Multivariate ANOVA', icon: Layers, component: ManovaPage },
          { id: 'repeated-measures-anova', label: 'Repeated Measure ANOVA', icon: Repeat, component: RepeatedMeasuresAnovaPage },
        ]
      },
      {
        name: 'Non-Parametric',
        items: [
          { id: 'mann-whitney', label: 'Mann-Whitney U Test', icon: Users, component: MannwhitneyPage },
          { id: 'wilcoxon', label: 'Wilcoxon Signed-Rank', icon: Repeat, component: WilcoxonPage },
          { id: 'kruskal-wallis', label: 'Kruskal-Wallis H-Test', icon: Users, component: KruskalPage },
          { id: 'friedman', label: 'Friedman Test', icon: Repeat, component: FriedmanPage },
        ]
      },
      {
        name: 'Statistical Design',
        items: [
          { id: 'power-analysis', label: 'Power Analysis', icon: Calculator, component: PowerAnalysisPage },
        ]
      }
    ]
  },
  {
    name: 'Relationship',
    icon: TrendingUp,
    subCategories: [
      {
        name: 'Relationship Analysis',
        items: [
          { id: 'correlation', label: 'Correlation', icon: Link2, component: CorrelationPage },
          { id: 'crosstab', label: 'Crosstab & Chi-Squared', icon: Columns, component: CrosstabPage },
        ]
      },
      {
        name: 'Regression Analysis',
        items: [
          { id: 'regression-simple', label: 'Simple Linear Regression', icon: TrendingUp, component: RegressionPage },
          { id: 'regression-multiple', label: 'Multiple Linear Regression', icon: TrendingUp, component: RegressionPage },
          { id: 'regression-polynomial', label: 'Polynomial Regression', icon: TrendingUp, component: RegressionPage },
          { id: 'logistic-regression', label: 'Logistic Regression', icon: TrendingUp, component: LogisticRegressionPage },
          { id: 'lasso-regression', label: 'Lasso Regression', icon: TrendingUp, component: LassoRegressionPage },
          { id: 'ridge-regression', label: 'Ridge Regression', icon: TrendingUp, component: RidgeRegressionPage },
          { id: 'robust-regression', label: 'Robust Regression', icon: TrendingUp, component: RobustRegressionPage },
          { id: 'glm', label: 'Generalized Linear Model (GLM)', icon: Scaling, component: GlmPage },
          
        ]
      },
      {
        name: 'Model Interpretation',
        items: [
          { id: 'relative-importance', label: 'Relative Importance', icon: Percent, component: RelativeImportancePage },
          { id: 'feature-importance', label: 'Feature Importance', icon: BarChart2, component: FeatureImportancePage },
        ]
      }
    ]
  },
  {
    name: 'Predictive',
    icon: Brain,
    subCategories: [
      {
        name: 'Classification',
        items: [
          { id: 'discriminant', label: 'Linear Discriminant Analysis (LDA)', icon: Users, component: DiscriminantPage },
          { id: 'decision-tree', label: 'Decision Tree', icon: GitBranch, component: DecisionTreePage },
          { id: 'gbm', label: 'Gradient Boosting (GBM)', icon: BrainCircuit, component: GbmPage },
          { id: 'random-forest', label: 'Random Forest', icon: GitBranch, component: RandomForestPage },
        ]
      },
      {
        name: 'Survival Analysis',
        items: [
          { id: 'survival', label: 'Survival Analysis', icon: HeartPulse, component: SurvivalAnalysisPage },
        ]
      },
      {
        name: 'Model Evaluation',
        items: [
          { id: 'cross-validation', label: 'Cross-Validation', icon: Layers, component: CrossValidationPage },
        ]
      }
    ]
  },
  {
    name: 'Structural',
    icon: Network,
    subCategories: [
      {
        name: 'Factor Analysis',
        items: [
          { id: 'reliability', label: 'Reliability (Cronbach)', icon: ShieldCheck, component: ReliabilityPage },
          { id: 'efa', label: 'Exploratory (EFA)', icon: FileSearch, component: EfaPage },
          { id: 'pca', label: 'Principal Component (PCA)', icon: Component, component: PcaPage },
          { id: 'reliability-validity', label: 'Reliability & Validity Analysis', icon: Shield, component: ReliabilityValidityPage }
        ]
      },
      {
        name: 'Path Analysis',
        items: [
          { id: 'mediation', label: 'Mediation Analysis', icon: GitBranch, component: MediationAnalysisPage },
          { id: 'moderation', label: 'Moderation Analysis', icon: GitCommit, component: ModerationAnalysisPage },        ]
      },
      {
        name: 'Network Analysis',
        items: [
          { id: 'sna', label: 'Social Network Analysis', icon: Network, component: SnaPage },
        ]
      }
    ]
  },
  {
    name: 'Clustering',
    icon: Users,
    subCategories: [
      {
        name: 'Distance-based',
        items: [
          { id: 'kmeans', label: 'K-Means', icon: ScanSearch, component: KMeansPage },
          { id: 'kmedoids', label: 'K-Medoids', icon: ScanSearch, component: KMedoidsPage },
        ]
      },
      {
        name: 'Density-based',
        items: [
          { id: 'dbscan', label: 'DBSCAN', icon: ScanSearch, component: DbscanPage },
          { id: 'hdbscan', label: 'HDBSCAN', icon: ScanSearch, component: HdbscanPage },
        ]
      },
      {
        name: 'Hierarchical-based',
        items: [
          { id: 'hca', label: 'Hierarchical Clustering (HCA)', icon: GitBranch, component: HcaPage },
        ]
      }
    ]
  },
  {
    name: 'Text Analysis',
    icon: FileText,
    items: [
      { id: 'sentiment', label: 'Sentiment Analysis', icon: Smile, component: SentimentAnalysisPage },
      { id: 'topic-modeling', label: 'Topic Modeling (LDA)', icon: MessagesSquare, component: TopicModelingPage },
      { id: 'wordcloud', label: 'Word Cloud', icon: Feather, component: WordCloudPage },
    ]
  },
  {
    name: 'Business',
    icon: Building2,
    items: [
      { id: 'scenario-sensitivity', label: 'Scenario Sensitivity', icon: Settings2, component: ScenarioSensitivityPage },
      { id: 'whatif', label: 'What-If Analysis', icon: FlaskConical, component: WhatIfPage },
      { id: 'threshold-optimization', label: 'Threshold Optimization', icon: SlidersHorizontal, component: ThresholdOptimizationPage },
      { id: 'cost-sensitive', label: 'Cost-Sensitive', icon: DollarSign, component: CostSensitivePage }

    ]
  },
  {
    name: 'Marketing',
    icon: Target,
    items: [
      { id: 'ipa', label: 'Importance-Performance Analysis', icon: Target, component: IpaPage },
      { id: 'funnel-analysis', label: 'Funnel Analysis', icon: Filter, component: FunnelPage },
      { id: 'nps', label: 'Net Promoter Score (NPS)', icon: ThumbsUp, component: NpsPage },
      { id: 'ltv-prediction', label: 'LTV Prediction', icon: DollarSign, component: LtvPage },
      { id: 'association-rule', label: 'Association rule', icon: Handshake, component: AssociationPage },
      { id: 'dea', label: 'Data Envelopment Analysis (DEA)', icon: Building, component: DeaPage },
      { id: 'roi-analysis', label: 'ROI Analysis', icon: Percent, component: RoiAnalysisPage },
    ],
  },
  {
    name: 'Human Resources',
    icon: UserX,
    items: [
        { id: 'turnover-rate-analysis', label: 'Turnover/Retention Analysis', icon: TrendingUp, component: TurnoverAnalysisPage },
        { id: 'talent-risk-matrix', label: 'Key Talent Risk Matrix', icon: Grid, component: RiskMatrixPage },
        { id: 'satisfaction-engagement-matrix', label: 'Satisfaction-Engagement Matrix', icon: Grid, component: SatisfactionEngagementMatrixPage },
        { id: 'attendance-pattern-analysis', label: 'Attendance Pattern Analysis', icon: CalendarDays, component: AttendanceAnalysisPage },
        { id: 'headcount-stability-analysis', label: 'Headcount Stability', icon: Users, component: HeadcountStabilityPage },
    ],
  },
  {
    name: 'Finance',
    icon: Landmark,
    subCategories: [
      {
        name: 'Financial Modeling',
        items: [
          { id: 'portfolio-optimization', label: 'Portfolio Optimization', icon: TrendingUp, component: FinancialModelingPage },
          { id: 'factor-analysis', label: 'Factor Analysis (Fama-French)', icon: GitBranch, component: FactorAnalysisPage }, 
          { id: 'options-pricing', label: 'Options Pricing', icon: Calculator, component: OptionsPricingPage },
        ]
      },
      {
        name: 'Quantitative Trading',
        items: [
          { id: 'backtesting', label: 'Backtesting', icon: TrendingUp, component: BacktestingPage },
          { id: 'pairs-trading', label: 'Pair Trading', icon: TrendingUp, component: PairsTradingPage },
        ]
      },
      {
        name: 'Risk Management',
        items: [
          { id: 'quantitative-risk-analysis', label: 'Quantitative Risk Analysis', icon: Sigma, component: QuantitativeRiskAnalysisPage },
          { id: 'credit-risk', label: 'Credit Risk', icon: Shield, component: CreditRiskPage },

        ]
      },
    ]
  },
 
  {
    name: 'Quality Control',
    icon: CheckSquare,
    subCategories: [
      {
        name: 'Process Monitoring',
        items: [
          { id: 'sqc', label: 'Control Charts', icon: TrendingUp, component: SqcPage },
          { id: 'process-capability', label: 'Process Capability', icon: TrendingUp, component: ProcessCapabilityPage },
          { id: 'attribute-control-charts', label: 'Attribute Control Charts', icon: TrendingUp, component: AttributeControlChartsPage },
          { id: 'gage-rr', label: 'Gage R&R', icon: ShieldCheck, component: GageRrPage },
        ]
      },
      {
        name: 'Quality Improvement',
        items: [
          { id: 'pareto-analysis', label: 'Pareto Analysis', icon: BarChart, component: ParetoAnalysisPage },
          { id: 'acceptance-sampling', label: 'Acceptance Sampling', icon: CheckSquare, component: AcceptanceSamplingPage },
        ]
      }
    ]
  },
  {
    name: 'Supply Chain',
    icon: Share2,
    subCategories: [
      {
        name: 'Optimization',
        items: [
          { id: 'linear-programming', label: 'Linear Programming', icon: TrendingUp, component: LinearProgrammingPage },
          { id: 'nonlinear-programming', label: 'Nonlinear Programming', icon: TrendingUp, component: NonlinearPage },
          { id: 'goal-programming', label: 'Goal Programming', icon: Award, component: GoalProgrammingPage },
          { id: 'transportation-problem', label: 'Transportation Problem', icon: Truck, component: TransportationProblemPage },
          { id: 'vrp-tsp', label: 'VRP / TSP', icon: Map, component: VrpTspPage },
        ],
      },
      {
        name: 'Inventory',
        items: [
          { id: 'eoq-optimization', label: 'EOQ Inventory Optimization', icon: Package, component: EOQOptimizationPage },
          { id: 'inventory-policy', label: 'Inventory Policy', icon: Container, component: InventoryOptimizationPage },
          { id: 'lead-time-analysis', label: 'Lead Time Analysis', icon: Clock, component: LeadTimeAnalysisPage },
        ],
      },
      {
        name: 'Logistics',
        items: [
          { id: 'fleet-optimization', label: 'Fleet Optimization', icon: Car, component: FleetOptimizationPage },
        ],
      },
    ]
  },
];

const STATISTICA_FEATURES = [
  { 
    id: 'upload', 
    icon: FileUp, 
    label: 'Upload Data', 
    description: 'Easily upload your CSV, Excel, or JSON files.',
    image: "/placeholder.svg" // Replace with actual image path
  },
  { 
    id: 'recommend', 
    icon: Wand2, 
    label: 'AI Recommendation', 
    description: 'Not sure where to start? Our AI suggests the best analysis for your data.',
    image: "/placeholder.svg"
  },
  { 
    id: 'guided', 
    icon: Milestone, 
    label: 'Guided Analysis', 
    description: 'Follow a simple 6-step process for any statistical test, from variable selection to results.',
    image: "/placeholder.svg"
  },
  { 
    id: 'visualize', 
    icon: BarChart3, 
    label: 'Instant Visualization', 
    description: 'Get publication-ready charts and graphs automatically generated with your results.',
    image: "/placeholder.svg"
  },
  { 
    id: 'interpret', 
    icon: Bot, 
    label: 'AI Interpretation', 
    description: 'Receive clear, APA-formatted reports and plain-language summaries of what your results mean.',
    image: "/placeholder.svg"
  },
];

const analysisPages: Record<string, React.ComponentType<any>> = analysisCategories
  .flatMap(category => category.isSingle ? category.items : ('items' in category && category.items ? category.items : (category.subCategories || []).flatMap((sc: AnalysisSubCategory) => sc.items)))
  .reduce((acc, item) => {
    if (item) {
        acc[item.id] = item.component;
    }
    return acc;
  }, {} as Record<string, React.ComponentType<any>>);


const IntroPage = ({ onFileSelected, onLoadExample, isUploading }: { onFileSelected: (file: File) => void; onLoadExample: (example: ExampleDataSet) => void; isUploading: boolean }) => {
    const irisExample = exampleDatasets.find(ex => ex.id === 'iris');
    const [activeFeature, setActiveFeature] = useState(STATISTICA_FEATURES[0].id);
    const activeFeatureData = STATISTICA_FEATURES.find(f => f.id === activeFeature);

    return (
        <div className="flex flex-1 items-center justify-center p-6 bg-slate-50">
            <Card className="w-full max-w-5xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Calculator className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Welcome to Statistica</CardTitle>
                    <CardDescription className="text-base mt-2 max-w-2xl mx-auto">
                        Your intelligent partner for statistical analysis. Go from raw data to actionable insights in minutes, not hours.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10">
                    {/* Core Features - Animated Tabs */}
                    <div className="text-center">
                        <h3 className="text-2xl font-bold font-headline mb-6">Statistica's Core Features</h3>
                        <div className="flex justify-center gap-2 border-b">
                            {STATISTICA_FEATURES.map(feature => (
                                <button
                                    key={feature.id}
                                    onClick={() => setActiveFeature(feature.id)}
                                    className={cn(
                                        "py-3 px-4 text-sm font-semibold transition-colors relative",
                                        activeFeature === feature.id ? "text-primary" : "text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <feature.icon className="w-4 h-4" />
                                        <span>{feature.label}</span>
                                    </div>
                                    {activeFeature === feature.id && (
                                        <motion.div
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                                            layoutId="underline"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="relative mt-4 w-full h-[350px] overflow-hidden bg-slate-100 rounded-lg">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeFeature}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center p-6"
                                >
                                    {activeFeatureData && (
                                        <div className="text-center">
                                             <div className="p-3 bg-primary/10 rounded-full inline-block mb-4">
                                                <activeFeatureData.icon className="w-8 h-8 text-primary" />
                                            </div>
                                            <p className="text-lg font-semibold max-w-lg mx-auto">{activeFeatureData.description}</p>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                    {/* Data Upload */}
                    <div className="grid md:grid-cols-2 gap-6 items-start">
                        <Card className="hover:border-primary/50 hover:shadow-lg transition-all">
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><FileUp className="w-5 h-5"/>Upload Your Data</CardTitle>
                                <CardDescription>Get started by uploading your dataset.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <DataUploader onFileSelected={onFileSelected} loading={isUploading} />
                            </CardContent>
                        </Card>
                        <Card className="hover:border-primary/50 hover:shadow-lg transition-all">
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5"/>Use Sample Data</CardTitle>
                                <CardDescription>Don't have a dataset? Try one of ours.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {irisExample && (
                                    <Button size="lg" variant="outline" onClick={() => onLoadExample(irisExample)} className="w-full">
                                        <irisExample.icon className="mr-2 h-5 w-5" />
                                        Load Iris Dataset
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default function StatisticaApp() {
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
  const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [report, setReport] = useState<{ title: string, content: string } | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState('guide');
  const [openCategories, setOpenCategories] = useState<string[]>(['Guide']);
  const [searchTerm, setSearchTerm] = useState('');
  const [analysisResultForChat, setAnalysisResultForChat] = useState<any>(null);

  const { toast } = useToast();

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  };

  const handleClearData = useCallback(() => {
    setData([]);
    setAllHeaders([]);
    setNumericHeaders([]);
    setCategoricalHeaders([]);
    setFileName('');
    setActiveAnalysis('guide');
    setAnalysisResultForChat(null);
  }, []);


  const processData = useCallback((content: string, name: string) => {
    setIsUploading(true);
    try {
        const { headers: newHeaders, data: newData, numericHeaders: newNumericHeaders, categoricalHeaders: newCategoricalHeaders } = parseData(content);
        if (newData.length === 0 || newHeaders.length === 0) {
          throw new Error("No valid data found in the file.");
        }
        setData(newData);
        setAllHeaders(newHeaders);
        setNumericHeaders(newNumericHeaders);
        setCategoricalHeaders(newCategoricalHeaders);
        setFileName(name);
        toast({ title: 'Success', description: `Loaded "${name}" and found ${newData.length} rows.`});

      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'File Processing Error',
          description: error.message || 'Could not parse file. Please check the format.',
        });
        handleClearData();
      } finally {
        setIsUploading(false);
      }
  }, [toast, handleClearData]);

  const handleFileSelected = useCallback((file: File) => {
    setIsUploading(true);
    const reader = new FileReader();

    reader.onerror = () => {
      toast({ variant: 'destructive', title: 'File Read Error', description: 'An error occurred while reading the file.' });
      setIsUploading(false);
    };

    if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          const workbook = XLSX.read(uint8Array, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          processData(csv, file.name);
        } catch (error) {
          toast({ variant: 'destructive', title: 'Excel Parse Error', description: 'Could not parse Excel file.' });
          setIsUploading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) {
          toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read file content.' });
          setIsUploading(false);
          return;
        }
        processData(content, file.name);
      };
      reader.readAsText(file);
    }
  }, [processData, toast]);

  const handleLoadExampleData = useCallback((example: ExampleDataSet) => {
    setIsUploading(true);
    processData(example.data, example.name);
    if (example.recommendedAnalysis) {
      setActiveAnalysis(example.recommendedAnalysis);
    }
  }, [processData]);

  const handleDownloadData = useCallback(() => {
    if (data.length === 0) {
      toast({ title: 'No Data to Download', description: 'There is no data currently loaded.' });
      return;
    }
    try {
      const csvContent = unparseData({ headers: allHeaders, data });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/\.[^/.]+$/, "") + "_statistica.csv" || 'statistica_data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download data:', error);
      toast({ variant: 'destructive', title: 'Download Error', description: 'Could not prepare data for download.' });
    }
  }, [data, allHeaders, fileName, toast]);

  const handleGenerateReport = useCallback(async (analysisType: string, stats: any, viz: string | null) => {
    setIsGeneratingReport(true);
    try {
      const result = await getSummaryReport({
        analysisType,
        statistics: JSON.stringify(stats, null, 2),
        visualizations: viz || "No visualization available.",
      });
      if (result.success && result.report) {
        setReport({ title: 'Analysis Report', content: result.report });
      } else {
        toast({ variant: 'destructive', title: 'Failed to generate report', description: result.error });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'An error occurred while generating the report.' });
    } finally {
      setIsGeneratingReport(false);
    }
  }, [toast]);

  const downloadReport = useCallback(() => {
    if (!report) return;
    const blob = new Blob([report.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'statistica_report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [report]);

  const hasData = data.length > 0;

  const filteredAnalysisCategories: AnalysisCategory[] = useMemo(() => {
    if (!searchTerm) {
        return analysisCategories;
    }
    const lowercasedFilter = searchTerm.toLowerCase();

    return analysisCategories.map(category => {
        if (category.isSingle) {
            const hasMatch = category.items[0].label.toLowerCase().includes(lowercasedFilter);
            return hasMatch ? category : null;
        }

        if (category.items) {
            const filteredItems = category.items.filter(item => item.label.toLowerCase().includes(lowercasedFilter));
            return filteredItems.length > 0 ? { ...category, items: filteredItems } : null;
        }

        if (category.subCategories) {
            const filteredSubCategories = category.subCategories
                .map((sub: AnalysisSubCategory) => {
                    const filteredItems = sub.items.filter(item => item.label.toLowerCase().includes(lowercasedFilter));
                    return filteredItems.length > 0 ? { ...sub, items: filteredItems } : null;
                })
                .filter(Boolean) as AnalysisSubCategory[];

            return filteredSubCategories.length > 0 ? { ...category, subCategories: filteredSubCategories } : null;
        }

        return null;
    }).filter(Boolean) as AnalysisCategory[];
  }, [searchTerm]);

  const ActivePageComponent = useMemo(() => {
    for (const category of analysisCategories) {
        if (category.isSingle) {
            const found = category.items.find(item => item.id === activeAnalysis);
            if (found) return found.component;
        } else if (category.items) {
            const found = category.items.find(item => item.id === activeAnalysis);
            if (found) return found.component;
        } else if (category.subCategories) {
            for (const sub of category.subCategories) {
                const found = sub.items.find((item: any) => item.id === activeAnalysis);
                if(found) return found.component;
            }
        }
    }
    return GuidePage;
  }, [activeAnalysis]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="offcanvas">
          <SidebarHeader>
            <div className='p-2 space-y-2'>
              <DataUploader 
                onFileSelected={handleFileSelected}
                loading={isUploading}
              />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search analyses..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {filteredAnalysisCategories.map(category =>
                category.isSingle ? (
                  <SidebarMenuItem key={category.name}>
                    <SidebarMenuButton
                      onClick={() => setActiveAnalysis(category.items[0].id)}
                      isActive={activeAnalysis === category.items[0].id}
                      className="text-base font-semibold"
                    >
                      <category.icon className="mr-2 h-5 w-5" />
                      {category.name}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : (
                  <Collapsible key={category.name} open={openCategories.includes(category.name)} onOpenChange={() => toggleCategory(category.name)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start text-base px-2 font-semibold shadow-md border bg-white text-foreground hover:bg-slate-50">
                        <category.icon className="mr-2 h-5 w-5" />
                        <span>{category.name}</span>
                        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes(category.name) && 'rotate-180')} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {category.items ? (
                        <SidebarMenu>
                          {category.items.map((item: any) => (
                            <SidebarMenuItem key={item.id}>
                              <SidebarMenuButton
                                onClick={() => setActiveAnalysis(item.id)}
                                isActive={activeAnalysis === item.id}
                              >
                                {item.icon && <item.icon />}
                                {item.label}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      ) : (
                        category.subCategories && (
                          <SidebarMenu>
                            {category.subCategories.map((sub: any, i: number) => (
                              <div key={i}>
                                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-2 my-1">{sub.name}</SidebarGroupLabel>
                                {sub.items.map((item: any) => (
                                  <SidebarMenuItem key={item.id}>
                                    <SidebarMenuButton
                                      onClick={() => setActiveAnalysis(item.id)}
                                      isActive={activeAnalysis === item.id}
                                    >
                                      {item.icon && <item.icon />}
                                      {item.label}
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                ))}
                              </div>
                            ))}
                          </SidebarMenu>
                        )
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            {/* UserNav is now in the page header */}
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger />
                <div />
            </header>

            {hasData && activeAnalysis !== 'guide' && activeAnalysis !== 'recommendation' && (
              <DataPreview 
                fileName={fileName}
                data={data}
                headers={allHeaders}
                onDownload={handleDownloadData}
                onClearData={handleClearData}
              />
            )}
            
            <ActivePageComponent 
                data={data}
                allHeaders={allHeaders}
                numericHeaders={numericHeaders}
                categoricalHeaders={categoricalHeaders}
                onLoadExample={handleLoadExampleData}
                onFileSelected={handleFileSelected}
                isUploading={isUploading}
                activeAnalysis={activeAnalysis}
                onAnalysisComplete={setAnalysisResultForChat}
              />
          </div>
        </SidebarInset>
      </div>

       <AIInteractionController 
        activeAnalysis={activeAnalysis}
        analysisResultForChat={analysisResultForChat}
      />

    </SidebarProvider>
  );
}

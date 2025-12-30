'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
  SidebarGroupLabel
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  FileText,
  ArrowDownUp,
  Loader2,
  Landmark,
  UserX,
  Building2,
  Waves,
  TrendingUp,
  Grid,
  BarChart,
  GitBranch,
  Users,
  Waypoints,
  CalendarDays,
  Wand2,
  Sigma,
  TestTube,
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
  Package,
  Atom,
  MessagesSquare,
  Share2,
  GitCommit,
  DollarSign,
  SlidersHorizontal,
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
  BookOpen,
  Building,
  Award,
  Truck,
  Percent,
  Container,
  Search
} from 'lucide-react';


import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  type DataSet,
  parseData,
  unparseData,
} from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { getSummaryReport } from '@/app/actions';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';
import DescriptiveStatisticsPage from './pages/descriptive-stats-page';
import CorrelationPage from './pages/correlation-page';
import AnovaPage from './pages/anova-page';
import TwoWayAnovaPage from './pages/two-way-anova-page';
import AncovaPage from './pages/ancova-page';
import ManovaPage from './pages/manova-page';
import ReliabilityPage from './pages/reliability-page';
import RegressionPage from './pages/regression-page';
import LogisticRegressionPage from './pages/logistic-regression-page';
import GlmPage from './pages/glm-page';
import EfaPage from './pages/efa-page';
import MediationAnalysisPage from './pages/MediationAnalysisPage';
import ModerationAnalysisPage from './pages/ModerationAnalysisPage'; 
import KMeansPage from './pages/kmeans-page';
import KMedoidsPage from './pages/kmedoids-page';
import HcaPage from './pages/hca-page';
import DbscanPage from './pages/dbscan-page';
import HdbscanPage from './pages/hdbscan-page';
import PcaPage from './pages/pca-page';
import MdsPage from './pages/mds-page';
import DiscriminantPage from './pages/discriminant-page';
import FriedmanPage from './pages/friedman-page';
import MannwhitneyPage from './pages/mann-whitney-page';
import KruskalPage from './pages/kruskal-wallis-page';
import WilcoxonPage from './pages/wilcoxon-page';
import FrequencyAnalysisPage from './pages/frequency-analysis-page';
import CrosstabPage from './pages/crosstab-page';
import NormalityTestPage from './pages/normality-test-page';
import HomogeneityTestPage from './pages/homogeneity-test-page';
import SurvivalAnalysisPage from './pages/survival-analysis-page';
import FunnelPage from './pages/funnel-analysis-page';
import GbmPage from './pages/gbm-page';
import SentimentAnalysisPage from './pages/sentiment-analysis-page';
import NonlinearRegressionPage from './pages/nonlinear-regression-page';
import TopicModelingPage from './pages/topic-modeling-page';
import TrendAnalysisPage from './pages/trend-analysis-page';
import SeasonalDecompositionPage from './pages/seasonal-decomposition-page';
import AcfPacfPage from './pages/acf-pacf-page';
import StationarityPage from './pages/stationarity-page';
import ArimaPage from './pages/arima-page';
import ExponentialSmoothingPage from './pages/exponential-smoothing-page';
import ForecastEvaluationPage from './pages/forecast-evaluation-page';
import ArchLmTestPage from './pages/arch-lm-test-page';
import LjungBoxPage from './pages/ljung-box-page';
import RepeatedMeasuresAnovaPage from './pages/repeated-measures-anova-page';
import TTestPage from './pages/t-test-page';
import { cn } from '@/lib/utils';
import WordCloudPage from './pages/wordcloud-page';
import IpaPage from './pages/ipa-page';
import HistoryPage from './pages/history-page';
import html2canvas from 'html2canvas';
import InstrumentalVariableRegressionPage from './pages/instrumental-variable-regression-page';
import PsmPage from './pages/psm-page';
import DidPage from './pages/did-page';
import RddPage from './pages/rdd-page';
import GuidePage from './pages/guide-page';
import VariabilityAnalysisPage from './pages/variability-analysis-page';
import NpsPage from './pages/nps-page';
import LinearProgrammingPage from './pages/linear-programming-page';
import GoalProgrammingPage from './pages/goal-programming-page';
import TransportationProblemPage from './pages/transportation-problem-page';
import DeaPage from './pages/dea-page';
import RelativeImportancePage from './pages/relative-importance-page';
import RandomForestPage from './pages/random-forest-page';
import LassoRegressionPage from './pages/lasso-regression-page';
import RidgeRegressionPage from './pages/ridge-regression-page';
import ClassifierComparisonPage from './pages/classifier-comparison-page';
import OutlierDetectionPage from './pages/outlier-detection-page';
import DecisionTreePage from './pages/decision-tree-page';
import RobustRegressionPage from './pages/robust-regression-page';
import { UserNav } from './user-nav';
import { Separator } from '@/components/ui/separator';
import SnaPage from './pages/sna-page';
import { Input } from '@/components/ui/input';
import SqcPage from '@/components/pages/sqc-page';
import ProcessCapabilityPage from '@/components/pages/process-capability-page';
import AttributeControlChartsPage from '@/components/pages/attribute-control-charts-page';
import LtvPage from '@/components/pages/ltv-page';
import ParetoAnalysisPage from '@/components/pages/pareto-analysis-page';
import GageRrPage from '@/components/pages/gage-rr-page';
import AssociationPage from './pages/association-rule-page';
import AcceptanceSamplingPage from './pages/acceptance-sampling-page';
import NonlinearPage from '@/components/pages/nonlinear-programming-page';
import OneSampleTTestPage from '@/components/pages/OneSampleTTestPage';
import IndependentSamplesTTestPage from '@/components/pages/IndependentSamplesTTestPage';
import PairedSamplesTTestPage from '@/components/pages/PairedSamplesTTestPage';
import WelchsTTestPage from '@/components/pages/WelchsTTestPage';
import RoiAnalysisPage from '@/components/pages/roi-analysis-page';
import TurnoverAnalysisPage from '@/components/pages/turnover-analysis-page';
import RiskMatrixPage from '@/components/pages/risk-matrix-page';
import AttendanceAnalysisPage from '@/components/pages/attendance-analysis-page';
import SatisfactionEngagementMatrixPage from '@/components/pages/satisfaction-engagement-matrix-page';
import HeadcountStabilityPage from '@/components/pages/headcount-stability-page';
import DemandForecastingPage from './pages/demand-forecasting-page';
import PanelDataRegressionPage from './pages/panel-data-regression-page';
import FinancialModelingPage from './pages/portfolio-optimization-page';
import QuantitativeRiskAnalysisPage from '@/components/pages/quantitative-risk-analysis-page';
import BacktestingPage from '@/components/pages/Backtestingpage';
import PairsTradingPage from '@/components/pages/PairsTradingPage';
import EOQOptimizationPage from '@/components/pages/EOQOptimizationPage';
import LinearityCheckPage from '@/components/pages/LinearityCheckPage';
import AutocorrelationTestPage from '@/components/pages/AutocorrelationTestPage';
import PowerAnalysisPage from '@/components/pages/PowerAnalysisPage';
import InfluenceDiagnosticsPage from '@/components/pages/InfluenceDiagnosticsPage';
import CrossValidationPage from '@/components/pages/CrossValidationPage';
import FeatureImportancePage from '@/components/pages/FeatureImportancePage';
import RollingStatisticsPage from '@/components/pages/RollingStatisticsPage';
import StructuralBreakPage from '@/components/pages/StructuralBreakPage';
import ChangePointPage from '@/components/pages/ChangePointPage';
import ForecastHorizonPage from '@/components/pages/ForecastHorizonPage';
import SeasonalStrengthPage from '@/components/pages/SeasonalStrengthPage';
import ScenarioSensitivityPage from '@/components/pages/ScenarioSensitivityPage';
import WhatIfPage from '@/components/pages/WhatIfPage';
import ThresholdOptimizationPage from '@/components/pages/ThresholdOptimizationPage';
import CostSensitivePage from '@/components/pages/CostSensitivePage';
import LeadTimeAnalysisPage from '@/components/pages/LeadTimeAnalysisPage';
import VrpTspPage from '@/components/pages/vrp-tsp-page';
import InventoryOptimizationPage from '@/components/pages/inventory-optimization-page';
import FleetOptimizationPage from '@/components/pages/fleet-optimization-page';
import ReliabilityValidityPage from '@/components/pages/ReliabilityValidityPage';
import FactorAnalysisPage from '@/components/pages/FactorAnalysisPage';
import OptionsPricingPage from '@/components/pages/OptionsPricingPage';
import CreditRiskPage from '@/components/pages/CreditRiskPage';
import RecommendationPage from '@/components/pages/recommendation-page';


const analysisCategories = [
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
          { id: 'nonparametric-kruskal-wallis', label: 'Kruskal-Wallis H-Test', icon: Users, component: KruskalPage },
          { id: 'nonparametric-friedman', label: 'Friedman Test', icon: Repeat, component: FriedmanPage },
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
          { id: 'cross-validation', label: 'Cross-Validation', icon: Layers, component: CrossValidationPage }
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
    name: 'Time Series',
    icon: LineChart,
    subCategories: [
      {
        name: 'Exploratory Stage',
        items: [
          { id: 'trend-analysis', label: 'Trend Analysis', icon: TrendingUp, component: TrendAnalysisPage },
          { id: 'seasonal-decomposition', label: 'Seasonal Decomposition', icon: AreaChart, component: SeasonalDecompositionPage },
          { id: 'rolling-statistics', label: 'Rolling Statistics', icon: Activity, component: RollingStatisticsPage },        
          { id: 'structural-break', label: 'Structural Break', icon: Scissors, component: StructuralBreakPage },
          { id: 'seasonal-strength', label: 'Seasonal Strength', icon: Sun, component: SeasonalStrengthPage },
          { id: 'change-point', label: 'Change Point Detection', icon: Waypoints, component: ChangePointPage }
        ]
      },
      {
        name: 'Diagnostic Stage',
        items: [
          { id: 'acf-pacf', label: 'ACF/PACF', icon: BarChart, component: AcfPacfPage },
          { id: 'stationarity', label: 'ADF Test', icon: TrendingUp, component: StationarityPage },
          { id: 'ljung-box', label: 'Ljung-Box Test', icon: CheckSquare, component: LjungBoxPage },
          { id: 'arch-lm-test', label: 'ARCH-LM Test', icon: AlertTriangle, component: ArchLmTestPage },
        ]
      },
      {
        name: 'Modeling Stage',
        items: [
          { id: 'exponential-smoothing', label: 'Exponential Smoothing', icon: LineChart, component: ExponentialSmoothingPage },
          { id: 'arima', label: 'ARIMA / SARIMAX', icon: TrendingUp, component: ArimaPage },

        ]
      },
      {
        name: 'Evaluation Stage',
        items: [
          { id: 'forecast-evaluation', label: 'Forecast Model Evaluation', icon: Target, component: ForecastEvaluationPage },
          { id: 'demand-forecasting', label: 'Demand Forecasting', icon: TrendingUp, component: DemandForecastingPage },
          { id: 'forecast-horizon', label: 'Forecast Horizon', icon: Timer, component: ForecastHorizonPage },
        
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
      { id: 'Importance Performance Analysis', label: 'Importance-Performance Analysis', icon: Target, component: IpaPage },
      { id: 'Funnel Analysis', label: 'Funnel Analysis', icon: Target, component: FunnelPage },
      { id: 'Net promoter Score', label: 'Net Pomoter Score (NPS)', icon: Share2, component: NpsPage },
      { id: 'ltv-prediction', label: 'LTV Prediction', icon: DollarSign, component: LtvPage },
      { id: 'association-rule', label: 'Association rule', icon: DollarSign, component: AssociationPage },
      { id: 'dea', label: 'Data Envelopment Analysis (DEA)', icon: Building, component: DeaPage },
      { id: 'roi-analysis', label: 'ROI Analysis', icon: DollarSign, component: RoiAnalysisPage },
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
    ],
  } 
];


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
  const analysisPageRef = useRef<HTMLDivElement>(null);

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
  }, []);


  const processData = useCallback((content: string, name: string) => {
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
      toast({ title: 'Success', description: `Loaded "${name}" and found ${newData.length} rows.` });

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

  const handleDownloadAsPDF = useCallback(async () => {
    if (!analysisPageRef.current) return;
    toast({ title: "Generating PDF...", description: "Please wait while the report is being captured." });

    try {
      const canvas = await html2canvas(analysisPageRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: window.getComputedStyle(document.body).backgroundColor,
        onclone: (document) => {
          // You can modify the cloned document before capture if needed
        }
      });
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `Statistica_Report_${activeAnalysis}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = image;
      link.click();
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast({ title: "Error", description: "Could not generate PDF.", variant: "destructive" });
    }
  }, [activeAnalysis, toast]);

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

  const filteredAnalysisCategories = useMemo(() => {
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
          .map(sub => {
            const filteredItems = sub.items.filter(item => item.label.toLowerCase().includes(lowercasedFilter));
            return filteredItems.length > 0 ? { ...sub, items: filteredItems } : null;
          })
          .filter(Boolean) as typeof category.subCategories;

        return filteredSubCategories.length > 0 ? { ...category, subCategories: filteredSubCategories } : null;
      }

      return null;
    }).filter(Boolean) as typeof analysisCategories;
  }, [searchTerm]);

  const ActivePageComponent = useMemo(() => {
    for (const category of analysisCategories) {
      if ('items' in category) {
        const found = category.items.find(item => item.id === activeAnalysis);
        if (found) return found.component;
      } else if ('subCategories' in category) {
        for (const sub of category.subCategories) {
          const found = sub.items.find(item => item.id === activeAnalysis);
          if (found) return found.component;
        }
      }
    }
    return GuidePage;
  }, [activeAnalysis]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Calculator className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Statistica</h1>
            </div>
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
                      <Button variant="ghost" className="w-full justify-start text-base px-2 font-semibold bg-muted text-foreground">
                        <category.icon className="mr-2 h-5 w-5" />
                        <span>{category.name}</span>
                        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes(category.name) && 'rotate-180')} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {'items' in category ? (
                        <SidebarMenu>
                          {(category.items).map(item => (
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
                        <SidebarMenu>
                          {(category.subCategories).map((sub, i) => (
                            <div key={i}>
                              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-2 my-1">{sub.name}</SidebarGroupLabel>
                              {sub.items.map(item => (
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
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="flex-col gap-2">
            <div className="w-full flex gap-2">
              <Button variant="outline" onClick={() => setActiveAnalysis('history')} className="flex-1">
                <Clock />
                <span className="group-data-[collapsible=icon]:hidden">History</span>
              </Button>
              <Button onClick={handleDownloadAsPDF} disabled={!hasData} className="flex-1">
                <Download />
                <span className="group-data-[collapsible=icon]:hidden">PDF</span>
              </Button>
            </div>
            <Separator />
            <UserNav />
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div ref={analysisPageRef} className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-2xl font-headline font-bold md:hidden">Statistica</h1>
              <div />
            </header>

            {hasData && activeAnalysis !== 'guide' && (
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
              onGenerateReport={(stats: any, viz: string | null) => handleGenerateReport(activeAnalysis, stats, viz)}
            />
          </div>
        </SidebarInset>
      </div>

      <Dialog open={!!report} onOpenChange={(open) => !open && setReport(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline">{report?.title}</DialogTitle>
            <DialogDescription>
              An AI-generated summary of your data and selected analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-h-[60vh] overflow-y-auto rounded-md border p-4 whitespace-pre-wrap">
            {report?.content}
          </div>
          <DialogFooter>
            <Button onClick={downloadReport}>Download as .txt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}


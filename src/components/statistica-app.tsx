'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
import {
  FileUp,
  Wand2,
  Milestone,
  BarChart3,
  Bot,
  Calculator,
  Sparkles,
  Search,
  ChevronDown,
  BookOpen,
  BarChart,
  Users,
  TrendingUp,
  CheckSquare,
  Layers,
  AlertTriangle,
  ScatterChart,
  Waves,
  Crosshair,
  Target,
  Repeat,
  Link2,
  Columns,
  Percent,
  BarChart2,
  Scaling,
  Brain,
  GitBranch,
  BrainCircuit,
  Zap,
  CircleDot,
  HeartPulse,
  Network,
  ShieldCheck,
  FileSearch,
  Component,
  Move3D,
  GitCommit,
  ScanSearch,
  Blend,
  LineChart,
  AreaChart,
  Activity,
  Scissors,
  Waypoints,
  Timer,
  Landmark,
  GitCompare,
  Scale,
  SplitSquareVertical,
  Link,
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
import { getSummaryReport } from '@/app/actions';
import AIInteractionController from './AIInteractionController';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';

// Page Component Imports
import GuidePage from './pages/statistica/guide-page';
import RecommendationPage from './pages/statistica/recommendation-page';
import DescriptiveStatisticsPage from './pages/statistica/descriptive-stats-page';
import FrequencyAnalysisPage from './pages/statistica/frequency-analysis-page';
import VariabilityAnalysisPage from './pages/statistica/variability-analysis-page';
import NormalityTestPage from './pages/statistica/normality-test-page';
import HomogeneityTestPage from './pages/statistica/homogeneity-test-page';
import OutlierDetectionPage from './pages/statistica/outlier-detection-page';
import LinearityCheckPage from './pages/statistica/linearity-check-page';
import AutocorrelationTestPage from './pages/statistica/autocorrelation-test-page';
import InfluenceDiagnosticsPage from './pages/statistica/influence-diagnostics-page';
import OneSampleTTestPage from './pages/statistica/one-sample-ttest-page';
import IndependentSamplesTTestPage from './pages/statistica/independent-samples-ttest-page';
import PairedSamplesTTestPage from './pages/statistica/paired-samples-ttest-page';
import AnovaPage from './pages/statistica/anova-page';
import TwoWayAnovaPage from './pages/statistica/two-way-anova-page';
import AncovaPage from './pages/statistica/ancova-page';
import ManovaPage from './pages/statistica/manova-page';
import RepeatedMeasuresAnovaPage from './pages/statistica/RepeatedMeasuresAnovaPage';
import MannwhitneyPage from './pages/statistica/mann-whitney-page';
import WilcoxonPage from './pages/statistica/wilcoxon-page';
import KruskalPage from './pages/statistica/kruskal-page';
import FriedmanPage from './pages/statistica/friedman-page';
import CorrelationPage from './pages/statistica/correlation-page';
import CrosstabPage from './pages/statistica/crosstab-page';
import SimpleRegressionPage from './pages/statistica/simple-regression-page';
import MultipleRegressionPage from './pages/statistica/multiple-regression-page';
import PolynomialRegressionPage from './pages/statistica/polynomial-regression-page';
import LogisticRegressionPage from './pages/statistica/logistic-regression-page';
import LassoRegressionPage from './pages/statistica/lasso-regression-page';
import RidgeRegressionPage from './pages/statistica/ridge-regression-page';
import RobustRegressionPage from './pages/statistica/robust-regression-page';
import GlmPage from './pages/statistica/glm-page';
import RelativeImportancePage from './pages/statistica/relative-importance-page';
import FeatureImportancePage from './pages/statistica/feature-importance-page';
import DiscriminantPage from './pages/statistica/discriminant-page';
import DecisionTreePage from './pages/statistica/decision-tree-page';
import GbmPage from './pages/statistica/gbm-page';
import RandomForestPage from './pages/statistica/random-forest-page';
import XGBoostAnalysisPage from './pages/statistica/XGBoostAnalysisPage';
import SVMAnalysisPage from './pages/statistica/SVMAnalysisPage';
import KNNAnalysisPage from './pages/statistica/KNNAnalysisPage';
import NaiveBayesAnalysisPage from './pages/statistica/NaiveBayesAnalysisPage';
import KaplanMeierPage from './pages/statistica/kaplan-meier';
import CoxRegressionPage from './pages/statistica/cox-regression';
import CrossValidationPage from './pages/statistica/cross-validation-page';
import ReliabilityPage from './pages/statistica/reliability-page';
import EfaPage from './pages/statistica/efa-page';
import CfaPage from './pages/statistica/cfa-page';
import PcaPage from './pages/statistica/pca-page';
import MdsanalysisPage from './pages/statistica/Mdsanalysispage';
import MediationAnalysisPage from './pages/statistica/mediation-analysis-page';
import ModerationAnalysisPage from './pages/statistica/moderation-analysis-page';
import SEMAnalysisPage from './pages/statistica/SEMAnalysisPage';
import SnaPage from './pages/statistica/sna-page';
import KMeansPage from './pages/statistica/kmeans-page';
import KMedoidsPage from './pages/statistica/kmedoids-page';
import DbscanPage from './pages/statistica/dbscan-page';
import HdbscanPage from './pages/statistica/hdbscan-page';
import GMMPage from './pages/statistica/Gmmanalysispage';
import HcaPage from './pages/statistica/hca-page';
import TrendAnalysisPage from './pages/statistica/trend-analysis-page';
import SeasonalDecompositionPage from './pages/statistica/seasonal-decomposition-page';
import RollingStatisticsPage from './pages/statistica/rolling-statistics-page';
import ChangePointPage from './pages/statistica/change-point-page';
import AcfPacfPage from './pages/statistica/acf-pacf-page';
import StationarityPage from './pages/statistica/stationarity-page';
import LjungBoxPage from './pages/statistica/ljung-box-page';
import ArchLmTestPage from './pages/statistica/arch-lm-test-page';
import ExponentialSmoothingPage from './pages/statistica/exponential-smoothing-page';
import ArimaPage from './pages/statistica/arima-page';
import ForecastEvaluationPage from './pages/statistica/forecast-evaluation-page';
import ForecastHorizonPage from './pages/statistica/forecast-horizon-page';
import Didanalysispage from './pages/statistica/Didanalysispage';
import Psmanalysispage from './pages/statistica/Psmanalysispage';
import Rddanalysispage from './pages/statistica/Rddanalysispage';
import Ivanalysispage from './pages/statistica/Ivanalysispage';
import Varanalysispage from './pages/statistica/Varanalysispage';
import TwowayrepeatedPage from './pages/statistica/TwowayrepeatedPage';

// ============================================
// Types
// ============================================

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
  fileName: string;
  onClearData: () => void;
  onGenerateReport?: (analysisType: string, stats: any, viz: string | null) => void;
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

type StatisticaMode = 'explore' | 'model' | 'hub';

interface StatisticaAppProps {
  mode: StatisticaMode;
}

// ============================================
// Constants - Mode Categories
// ============================================

const EXPLORE_CATEGORIES = [
  'Overview',
  'Recommendation',
  'Descriptive',
  'Assumptions',
  'Comparison',
  'Relationship',
  'Econometrics'
] as const;

const MODEL_CATEGORIES = [
  'Overview',
  'Recommendation',
  'Predictive',
  'Clustering',
  'Time Series',
  'Structural'
] as const;

// ============================================
// Analysis Categories Data
// ============================================

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
          { id: 'repeated-measures-anova', label: 'One-Way RM ANOVA', icon: Repeat, component: RepeatedMeasuresAnovaPage },
          { id: 'Two-repeated-measures-anova', label: 'Mixed Design ANOVA', icon: Repeat, component: TwowayrepeatedPage },
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
          { id: 'regression-simple', label: 'Simple Linear Regression', icon: TrendingUp, component: SimpleRegressionPage },
          { id: 'regression-multiple', label: 'Multiple Linear Regression', icon: TrendingUp, component: MultipleRegressionPage },
          { id: 'regression-polynomial', label: 'Polynomial Regression', icon: TrendingUp, component: PolynomialRegressionPage },
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
          { id: 'xgboost', label: 'XGBoost', icon: Zap, component: XGBoostAnalysisPage },
          { id: 'svm', label: 'Support Vector Machine (SVM)', icon: Target, component: SVMAnalysisPage },
          { id: 'knn', label: 'K-Nearest Neighbors (KNN)', icon: CircleDot, component: KNNAnalysisPage },
          { id: 'naive-bayes', label: 'Naive Bayes', icon: Percent, component: NaiveBayesAnalysisPage },
        ]
      },
      {
        name: 'Survival Analysis',
        items: [
          { id: 'kaplan-meier', label: 'Kaplan-Meier Estimator', icon: HeartPulse, component: KaplanMeierPage },
          { id: 'cox-regression', label: 'Cox Regression', icon: TrendingUp, component: CoxRegressionPage },
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
    name: 'Econometrics',
    icon: Landmark,
    subCategories: [
      {
        name: 'Causal Inference',
        items: [
          { id: 'did', label: 'Difference-in-Differences (DID)', icon: GitCompare, component: Didanalysispage },
          { id: 'psm', label: 'Propensity Score Matching (PSM)', icon: Scale, component: Psmanalysispage },
          { id: 'rdd', label: 'Regression Discontinuity (RDD)', icon: SplitSquareVertical, component: Rddanalysispage },
          { id: 'iv', label: 'Instrumental Variables (IV)', icon: Link, component: Ivanalysispage },
        ]
      },
      {
        name: 'Advanced Econometrics',
        items: [
          { id: 'var', label: 'Vector Autoregression (VAR)', icon: TrendingUp, component: Varanalysispage },
        ]
      },
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
          { id: 'cfa', label: 'Confirmatory (CFA)', icon: FileSearch, component: CfaPage },
          { id: 'pca', label: 'Principal Component (PCA)', icon: Component, component: PcaPage },
          { id: 'mds', label: 'Multidimensional Scaling (MDS)', icon: Move3D, component: MdsanalysisPage },
        ]
      },
      {
        name: 'Path Analysis',
        items: [
          { id: 'mediation', label: 'Mediation Analysis', icon: GitBranch, component: MediationAnalysisPage },
          { id: 'moderation', label: 'Moderation Analysis', icon: GitCommit, component: ModerationAnalysisPage },
          { id: 'sem', label: 'SEM', icon: Component, component: SEMAnalysisPage },
        ]
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
        name: 'Distribution-based',
        items: [
          { id: 'gmm', label: 'Gaussian Mixture Model (GMM)', icon: Blend, component: GMMPage },
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
          { id: 'forecast-horizon', label: 'Forecast Horizon', icon: Timer, component: ForecastHorizonPage },
        ]
      }
    ]
  },
];

// ============================================
// Utility Functions
// ============================================

function getCategoriesByMode(mode: StatisticaMode): AnalysisCategory[] {
  const allowedCategories = mode === 'explore' ? EXPLORE_CATEGORIES : MODEL_CATEGORIES;
  return analysisCategories.filter(cat =>
    (allowedCategories as readonly string[]).includes(cat.name)
  );
}

function filterCategoriesBySearch(
  categories: AnalysisCategory[],
  searchTerm: string
): AnalysisCategory[] {
  if (!searchTerm) {
    return categories;
  }

  const lowercasedFilter = searchTerm.toLowerCase();

  return categories
    .map(category => {
      if (category.isSingle) {
        const hasMatch = category.items[0].label.toLowerCase().includes(lowercasedFilter);
        return hasMatch ? category : null;
      }

      if (category.items) {
        const filteredItems = category.items.filter(item =>
          item.label.toLowerCase().includes(lowercasedFilter)
        );
        return filteredItems.length > 0 ? { ...category, items: filteredItems } : null;
      }

      if (category.subCategories) {
        const filteredSubCategories = category.subCategories
          .map((sub: AnalysisSubCategory) => {
            const filteredItems = sub.items.filter(item =>
              item.label.toLowerCase().includes(lowercasedFilter)
            );
            return filteredItems.length > 0 ? { ...sub, items: filteredItems } : null;
          })
          .filter(Boolean) as AnalysisSubCategory[];

        return filteredSubCategories.length > 0
          ? { ...category, subCategories: filteredSubCategories }
          : null;
      }

      return null;
    })
    .filter(Boolean) as AnalysisCategory[];
}

function getAnalysisComponent(
  categories: AnalysisCategory[],
  analysisId: string
): React.ComponentType<any> | null {
  for (const category of categories) {
    if (category.isSingle) {
      const found = category.items.find(item => item.id === analysisId);
      if (found) return found.component;
    } else if (category.items) {
      const found = category.items.find(item => item.id === analysisId);
      if (found) return found.component;
    } else if (category.subCategories) {
      for (const sub of category.subCategories) {
        const found = sub.items.find(item => item.id === analysisId);
        if (found) return found.component;
      }
    }
  }
  return null;
}

// ============================================
// Feature Constants
// ============================================

const STATISTICA_FEATURES = [
  {
    id: 'upload',
    icon: FileUp,
    label: 'Upload Data',
    description: 'Easily upload your CSV, Excel, or JSON files.',
  },
  {
    id: 'recommend',
    icon: Wand2,
    label: 'AI Recommendation',
    description: 'Not sure where to start? Our AI suggests the best analysis for your data.',
  },
  {
    id: 'guided',
    icon: Milestone,
    label: 'Guided Analysis',
    description: 'Follow a simple 6-step process for any statistical test, from variable selection to results.',
  },
  {
    id: 'visualize',
    icon: BarChart3,
    label: 'Instant Visualization',
    description: 'Get publication-ready charts and graphs automatically generated with your results.',
  },
  {
    id: 'interpret',
    icon: Bot,
    label: 'AI Interpretation',
    description: 'Receive clear, APA-formatted reports and plain-language summaries of what your results mean.',
  },
];

// ============================================
// IntroPage Component
// ============================================

const IntroPage = ({
  onFileSelected,
  onLoadExample,
  isUploading
}: {
  onFileSelected: (file: File) => void;
  onLoadExample: (example: ExampleDataSet) => void;
  isUploading: boolean
}) => {
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
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <Card className="hover:border-primary/50 hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileUp className="w-5 h-5" />Upload Your Data</CardTitle>
                <CardDescription>Get started by uploading your dataset.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataUploader onFileSelected={onFileSelected} loading={isUploading} />
              </CardContent>
            </Card>
            <Card className="hover:border-primary/50 hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5" />Use Sample Data</CardTitle>
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

// ============================================
// Main Component
// ============================================

export default function StatisticaApp({ mode }: StatisticaAppProps) {
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

  // 모드에 따른 카테고리 필터링
  const modeCategories = useMemo(() => getCategoriesByMode(mode), [mode]);

  // 검색어에 따른 카테고리 필터링
  const filteredAnalysisCategories = useMemo(() =>
    filterCategoriesBySearch(modeCategories, searchTerm),
    [modeCategories, searchTerm]
  );

  // 활성 분석 페이지 컴포넌트
  const ActivePageComponent = useMemo(() => {
    const component = getAnalysisComponent(modeCategories, activeAnalysis);
    if (component) return component;

    const fallbackComponent = getAnalysisComponent(analysisCategories, activeAnalysis);
    return fallbackComponent || GuidePage;
  }, [activeAnalysis, modeCategories]);

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
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
                            {category.subCategories.map((sub: AnalysisSubCategory, i: number) => (
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
          <SidebarFooter />
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
              onGenerateReport={handleGenerateReport}
              fileName={fileName}
              onClearData={handleClearData}
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

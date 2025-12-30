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
  Download,
  Bot,
  BookOpen,
  Search,
  ArrowLeft
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';


import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { UserNav } from './user-nav';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
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

      if ('subCategories' in category && category.subCategories) {
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
        if (category.items) {
            const found = category.items.find(item => item.id === activeAnalysis);
            if (found) return found.component;
        } else if ('subCategories' in category && category.subCategories) {
            for (const sub of category.subCategories) {
                const found = sub.items.find(item => item.id === activeAnalysis);
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
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Calculator className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Skari</h1>
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
                      <Button variant="ghost" className="w-full justify-start text-base px-2 font-semibold shadow-md border bg-white text-foreground hover:bg-slate-50">
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
                        'subCategories' in category && category.subCategories && (
                          <SidebarMenu>
                            {category.subCategories.map((sub, i) => (
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
                        )
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <UserNav />
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div ref={analysisPageRef} className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between">
                <SidebarTrigger />
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
              onGenerateReport={(stats: any, viz: string | null) => {}}
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

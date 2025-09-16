'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
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
  SidebarInput,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Calculator,
  FileText,
  Loader2,
  Link2,
  BarChart2,
  Sigma,
  ChevronDown,
  PieChart,
  Bot,
  BrainCircuit,
  Presentation,
  Network,
  FlaskConical,
  ShieldCheck,
  Users,
  TrendingUp,
  Binary,
  Copy,
  BarChart,
  Columns,
  Target,
  Component,
  HeartPulse,
  Feather,
  GitBranch,
  Smile,
  Scaling,
  AreaChart,
  LineChart,
  Layers,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  type DataSet,
  parseData,
  unparseData,
} from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { getSummaryReport } from '@/app/actions';
import DescriptiveStatsPage from './pages/descriptive-stats-page';
import CorrelationPage from './pages/correlation-page';
import AnovaPage from './pages/anova-page';
import AncovaPage from './pages/ancova-page';
import VisualizationPage from './pages/visualization-page';
import ReliabilityPage from './pages/reliability-page';
import DiscriminantPage from './pages/discriminant-page';
import EfaPage from './pages/efa-page';
import CfaPage from './pages/cfa-page';
import MediationPage from './pages/mediation-page';
import ModerationPage from './pages/moderation-page';
import TTestPage from './pages/t-test-page';
import HcaPage from './pages/hca-page';
import ManovaPage from './pages/manova-page';
import RegressionPage from './pages/regression-page';
import LogisticRegressionPage from './pages/logistic-regression-page';
import KMeansPage from './pages/kmeans-page';
import FrequencyAnalysisPage from './pages/frequency-analysis-page';
import CrosstabPage from './pages/crosstab-page';
import SemPage from './pages/sem-page';
import ConjointAnalysisPage from './pages/conjoint-analysis-page';
import IpaPage from './pages/ipa-page';
import PcaPage from './pages/pca-page';
import SurvivalAnalysisPage from './pages/survival-analysis-page';
import WordCloudPage from './pages/wordcloud-page';
import GbmPage from './pages/gbm-page';
import GlmPage from './pages/glm-page';
import SentimentAnalysisPage from './pages/sentiment-analysis-page';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import TwoWayAnovaPage from './pages/two-way-anova-page';
import NonParametricPage from './pages/nonparametric-page';
import MetaAnalysisPage from './pages/meta-analysis-page';
import TrendAnalysisPage from './pages/trend-analysis-page';
import SeasonalDecompositionPage from './pages/seasonal-decomposition-page';
import NormalityTestPage from './pages/normality-test-page';
import HomogeneityTestPage from './pages/homogeneity-test-page';
import MovingAveragePage from './pages/moving-average-page';
import ExponentialSmoothingPage from './pages/exponential-smoothing-page';
import ArimaPage from './pages/arima-page';
import AcfPacfPage from './pages/acf-pacf-page';

type AnalysisType = 'stats' | 'correlation' | 'one-way-anova' | 'two-way-anova' | 'ancova' | 'manova' | 'reliability' | 'visuals' | 'discriminant' | 'efa' | 'cfa' | 'mediation' | 'moderation' | 'nonparametric' | 'hca' | 't-test' | 'regression' | 'logistic-regression' | 'glm' | 'kmeans' | 'frequency' | 'crosstab' | 'sem' | 'conjoint' | 'ipa' | 'pca' | 'survival' | 'wordcloud' | 'gbm' | 'sentiment' | 'meta-analysis' | 'trend-analysis' | 'seasonal-decomposition' | 'normality' | 'homogeneity' | 'moving-average' | 'exponential-smoothing' | 'arima' | 'acf-pacf' | 'mann-whitney' | 'wilcoxon' | 'kruskal-wallis' | 'friedman' | 'mcnemar' | string;

const analysisPages: Record<string, React.ComponentType<any>> = {
    stats: DescriptiveStatsPage,
    correlation: CorrelationPage,
    'one-way-anova': AnovaPage,
    'two-way-anova': TwoWayAnovaPage,
    ancova: AncovaPage,
    reliability: ReliabilityPage,
    discriminant: DiscriminantPage,
    efa: EfaPage,
    cfa: CfaPage,
    mediation: MediationPage,
    moderation: ModerationPage,
    nonparametric: NonParametricPage,
    'mann-whitney': NonParametricPage,
    'wilcoxon': NonParametricPage,
    'kruskal-wallis': NonParametricPage,
    'friedman': NonParametricPage,
    mcnemar: NonParametricPage,
    't-test': TTestPage,
    hca: HcaPage,
    manova: ManovaPage,
    regression: RegressionPage,
    'logistic-regression': LogisticRegressionPage,
    glm: GlmPage,
    kmeans: KMeansPage,
    frequency: FrequencyAnalysisPage,
    crosstab: CrosstabPage,
    sem: SemPage,
    conjoint: ConjointAnalysisPage,
    ipa: IpaPage,
    pca: PcaPage,
    survival: SurvivalAnalysisPage,
    wordcloud: WordCloudPage,
    visuals: VisualizationPage,
    gbm: GbmPage,
    sentiment: SentimentAnalysisPage,
    'meta-analysis': MetaAnalysisPage,
    'trend-analysis': TrendAnalysisPage,
    'seasonal-decomposition': SeasonalDecompositionPage,
    normality: NormalityTestPage,
    homogeneity: HomogeneityTestPage,
    'moving-average': MovingAveragePage,
    'exponential-smoothing': ExponentialSmoothingPage,
    arima: ArimaPage,
    'acf-pacf': AcfPacfPage,
};

const analysisMenu = [
  {
    field: 'Descriptive',
    icon: BarChart,
    methods: [
      { id: 'stats', label: 'Descriptive Statistics' },
      { id: 'frequency', label: 'Frequency Analysis' },
      { id: 'crosstab', label: 'Crosstabulation' },
      { id: 'normality', label: 'Normality Test' },
      { id: 'homogeneity', label: 'Homogeneity Test' },
    ]
  },
  {
    field: 'Hypothesis Testing',
    icon: Sigma,
    subCategories: [
      {
        name: 'Mean & Variance Tests',
        methods: [
          { id: 't-test', label: 't-Test' },
          { id: 'one-way-anova', label: 'One-Way ANOVA' },
          { id: 'two-way-anova', label: 'Two-Way ANOVA' },
          { id: 'ancova', label: 'ANCOVA' },
          { id: 'manova', label: 'MANOVA' },
        ]
      },
      {
        name: 'Non-Parametric Tests',
        methods: [
          { id: 'mann-whitney', label: 'Mann-Whitney / Wilcoxon' },
          { id: 'kruskal-wallis', label: 'Kruskal-Wallis / Friedman' },
          { id: 'mcnemar', label: "McNemar's Test" },
        ]
      },
    ]
  },
  {
    field: 'Correlation / Regression',
    icon: Link2,
    methods: [
      { id: 'correlation', label: 'Correlation Analysis' },
      { id: 'regression-simple', label: 'Simple Linear Regression' },
      { id: 'regression-multiple', label: 'Multiple Linear Regression' },
      { id: 'regression-polynomial', label: 'Polynomial Regression' },
      { id: 'regression-ridge', label: 'Ridge Regression' },
      { id: 'regression-lasso', label: 'Lasso Regression' },
      { id: 'logistic-regression', label: 'Logistic Regression' },
      { id: 'glm', label: 'General Linear Models (GLM)' },
    ]
  },
   {
    field: 'Clustering / Dimension Reduction',
    icon: Users,
    methods: [
      { id: 'kmeans', label: 'K-Means Clustering' },
      { id: 'hca', label: 'Hierarchical Clustering' },
      { id: 'discriminant', label: 'Discriminant Analysis' },
      { id: 'pca', label: 'Principal Component Analysis (PCA)' },
    ]
  },
  {
    field: 'Factor / Structural Modeling',
    icon: BrainCircuit,
    methods: [
       { id: 'reliability', label: 'Reliability Analysis' },
       { id: 'efa', label: 'Exploratory Factor Analysis (EFA)' },
       { id: 'cfa', label: 'Confirmatory Factor Analysis (CFA)' },
       { id: 'sem', label: 'Structural Equation Modeling (SEM)' },
       { id: 'mediation', label: 'Mediation Analysis' },
       { id: 'moderation', label: 'Moderation Analysis' },
    ]
  },
  {
    field: 'Time Series',
    icon: AreaChart,
    methods: [
      { id: 'trend-analysis', label: 'Trend Analysis' },
      { id: 'seasonal-decomposition', label: 'Seasonal Decomposition' },
      { id: 'moving-average', label: 'Moving Average' },
      { id: 'exponential-smoothing', label: 'Exponential Smoothing' },
      { id: 'arima', label: 'ARIMA' },
      { id: 'acf-pacf', label: 'ACF/PACF Plots' },
    ]
  },
  {
    field: 'Specialized Models',
    icon: FlaskConical,
    methods: [
      { id: 'conjoint', label: 'Conjoint Analysis' },
      { id: 'ipa', label: 'Importance-Performance Analysis (IPA)' },
      { id: 'survival', label: 'Survival Analysis' },
      { id: 'meta-analysis', label: 'Meta-Analysis' },
      { id: 'gbm', label: 'Gradient Boosting Machine (GBM)'},
      { id: 'decision-tree', label: 'Decision Tree', implemented: false },
    ]
  },
   {
    field: 'Text Analysis',
    icon: Feather,
    methods: [
       { id: 'wordcloud', label: 'Word Cloud' },
       { id: 'sentiment', label: 'Sentiment Analysis' },
    ]
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
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType>('stats');
  const [openCategories, setOpenCategories] = useState<string[]>(analysisMenu.map(c => c.field).concat(analysisMenu.flatMap(c => c.subCategories?.map(sc => sc.name) ?? [])));
  const [searchQuery, setSearchQuery] = useState('');

  const { toast } = useToast();
  
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
  }, [toast]);
  
  const handleFileSelected = useCallback((file: File) => {
    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) {
            toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read file content.' });
            setIsUploading(false);
            return;
        }
        processData(content, file.name);
    };

    reader.onerror = (e) => {
        toast({ variant: 'destructive', title: 'File Read Error', description: 'An error occurred while reading the file.' });
        setIsUploading(false);
    }
    
    if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        reader.readAsArrayBuffer(file);
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            processData(csv, file.name);
        }
    } else {
        reader.readAsText(file);
    }
  }, [processData, toast]);

  const handleClearData = () => {
    setData([]);
    setAllHeaders([]);
    setNumericHeaders([]);
    setCategoricalHeaders([]);
    setFileName('');
  };

  const handleLoadExampleData = (example: ExampleDataSet) => {
    if (example.id === 'meta-analysis') {
        setActiveAnalysis('meta-analysis');
        toast({title: 'Meta-Analysis', description: 'This analysis requires manual data entry. An example has been pre-filled for you.'});
        return;
    }
    processData(example.data, example.name);
    if(example.recommendedAnalysis) {
      setActiveAnalysis(example.recommendedAnalysis);
    }
  };

  const handleDownloadData = () => {
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
      a.download = fileName.replace(/\.[^/.]+$/, "") + ".csv" || 'statistica_data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download data:', error);
      toast({ variant: 'destructive', title: 'Download Error', description: 'Could not prepare data for download.' });
    }
  };

  const handleGenerateReport = async () => {
    if (data.length === 0) {
      toast({ title: 'No Data to Report', description: 'Please upload a file first.' });
      return;
    }
    setIsGeneratingReport(true);
    const statsString = `Columns in the loaded data: ${allHeaders.join(', ')}`;
    const vizString = "Visualizations for the loaded data.";

    const result = await getSummaryReport({ statistics: statsString, visualizations: vizString });
    if (result.success && result.report) {
      setReport({ title: 'Summary Report', content: result.report });
    } else {
      toast({ variant: 'destructive', title: 'Failed to generate report', description: result.error });
    }
    setIsGeneratingReport(false);
  };

  const downloadReport = () => {
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
  };
  
  const pageKey = activeAnalysis.startsWith('regression-') ? 'regression' : activeAnalysis;
  const ActivePageComponent = pageKey && analysisPages[pageKey] 
    ? analysisPages[pageKey]
    : DescriptiveStatsPage;


  const hasData = data.length > 0;
  
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  };

  const filteredMenu = useMemo(() => {
    if (!searchQuery) return analysisMenu;
    const lowercasedQuery = searchQuery.toLowerCase();
    
    return analysisMenu.map(category => {
      if (category.field.toLowerCase().includes(lowercasedQuery)) {
        return category; // Include the whole category if the main title matches
      }

      let matchingMethods: any[] = [];
      if (category.methods) {
        matchingMethods = category.methods.filter(method =>
          method.label.toLowerCase().includes(lowercasedQuery)
        );
      }

      let matchingSubCategories: any[] = [];
      if (category.subCategories) {
        matchingSubCategories = category.subCategories.map(sub => {
          const methods = sub.methods.filter(method =>
            method.label.toLowerCase().includes(lowercasedQuery)
          );
          if (methods.length > 0) {
            return { ...sub, methods };
          }
          if (sub.name.toLowerCase().includes(lowercasedQuery)) {
            return sub;
          }
          return null;
        }).filter(Boolean) as (typeof category.subCategories);
      }

      if (matchingMethods.length > 0 || matchingSubCategories.length > 0) {
        return {
          ...category,
          methods: matchingMethods,
          subCategories: matchingSubCategories
        };
      }

      return null;
    }).filter(Boolean) as typeof analysisMenu;
  }, [searchQuery]);

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
             <SidebarInput 
              placeholder="Search analyses..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-2 p-2">
            <div className='p-2'>
              <DataUploader 
                onFileSelected={handleFileSelected}
                loading={isUploading}
              />
            </div>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                    onClick={() => setActiveAnalysis('visuals')}
                    isActive={activeAnalysis === 'visuals'}
                    >
                    <BarChart2 />
                    <span>Visualizations</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
            
            <div className="flex-1 overflow-y-auto">
              {filteredMenu.map((category) => {
                const Icon = category.icon;
                const isOpen = openCategories.includes(category.field);

                return (
                  <Collapsible key={category.field} open={isOpen} onOpenChange={() => toggleCategory(category.field)}>
                    <CollapsibleTrigger className="w-full">
                      <div className={cn("flex items-center gap-2 rounded-md p-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", isOpen && "bg-sidebar-accent text-sidebar-accent-foreground")}>
                        <Icon className="h-4 w-4" />
                        <span>{category.field}</span>
                        <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", isOpen ? "rotate-180" : "")} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 py-1">
                      <SidebarMenu>
                        {category.methods?.map(method => (
                          <SidebarMenuItem key={method.id}>
                              <SidebarMenuButton
                                  onClick={() => setActiveAnalysis(method.id as AnalysisType)}
                                  isActive={activeAnalysis === method.id}
                                  disabled={method.implemented === false}
                                  className="justify-start w-full h-8 text-xs"
                              >
                                  <span>{method.label}</span>
                              </SidebarMenuButton>
                          </SidebarMenuItem>
                          )
                        )}
                        {category.subCategories?.map(sub => (
                           <Collapsible key={sub.name} open={openCategories.includes(sub.name)} onOpenChange={() => toggleCategory(sub.name)}>
                             <CollapsibleTrigger className="w-full">
                               <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground py-1">
                                  <span>{sub.name}</span>
                                  <ChevronDown className={cn("h-3 w-3 ml-auto transition-transform", openCategories.includes(sub.name) ? 'rotate-180' : '')} />
                               </div>
                             </CollapsibleTrigger>
                             <CollapsibleContent className="pl-6 py-1">
                                <SidebarMenu>
                                  {sub.methods.map((method) => (
                                    <SidebarMenuItem key={`${sub.name}-${method.id}`}>
                                      <SidebarMenuButton
                                          onClick={() => setActiveAnalysis(method.id as AnalysisType)}
                                          isActive={activeAnalysis === method.id}
                                          disabled={method.implemented === false}
                                          className="justify-start w-full h-8 text-xs"
                                      >
                                          <span>{method.label}</span>
                                      </SidebarMenuButton>
                                    </SidebarMenuItem>
                                  ))}
                                </SidebarMenu>
                             </CollapsibleContent>
                           </Collapsible>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>

          </SidebarContent>
          <SidebarFooter>
            <Button onClick={handleGenerateReport} disabled={isGeneratingReport || !hasData} className="w-full">
              {isGeneratingReport ? <Loader2 className="animate-spin" /> : <FileText />}
              {isGeneratingReport ? 'Generating...' : 'Generate Report'}
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger className="md:hidden"/>
                <h1 className="text-2xl font-headline font-bold md:hidden">Statistica</h1>
                <div />
            </header>
            
            {hasData && activeAnalysis !== 'stats' && activeAnalysis !== 'wordcloud' && activeAnalysis !== 'sentiment' && activeAnalysis !== 'meta-analysis' && (
              <DataPreview 
                fileName={fileName}
                data={data}
                headers={allHeaders}
                onDownload={handleDownloadData}
                onClearData={handleClearData}
              />
            )}
            
            <ActivePageComponent 
                key={activeAnalysis}
                activeAnalysis={activeAnalysis} 
                data={data}
                allHeaders={allHeaders}
                numericHeaders={numericHeaders}
                categoricalHeaders={categoricalHeaders}
                onLoadExample={handleLoadExampleData}
               />

          </div>
        </SidebarInset>
      </div>
      
      <Dialog open={!!report} onOpenChange={(open) => !open && setReport(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline">{report?.title}</DialogTitle>
            <DialogDescription>
              An AI-generated summary of your data analysis.
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

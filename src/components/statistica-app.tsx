
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
  BarChart,
  GitBranch,
  Users,
  Sigma,
  TestTube,
  Repeat,
  HeartPulse,
  Component,
  BrainCircuit,
  Network,
  Columns,
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
  Feather,
  Smile,
  Scaling,
  AreaChart,
  LineChart,
  ChevronsUpDown,
  Calculator,
  Brain,
  Link2,
  ShieldCheck,
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  Clock,
  Filter,
  Download,
  Bot
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
import CfaPage from './pages/cfa-page';
import MediationPage from './pages/mediation-page';
import ModerationPage from './pages/moderation-page';
import KMeansPage from './pages/kmeans-page';
import KMedoidsPage from './pages/kmedoids-page';
import HcaPage from './pages/hca-page';
import DbscanPage from './pages/dbscan-page';
import HdbscanPage from './pages/hdbscan-page';
import PcaPage from './pages/pca-page';
import MdsPage from './pages/mds-page';
import DiscriminantPage from './pages/discriminant-page';
import NonParametricPage from './pages/nonparametric-page';
import FrequencyAnalysisPage from './pages/frequency-analysis-page';
import CrosstabPage from './pages/crosstab-page';
import NormalityTestPage from './pages/normality-test-page';
import HomogeneityTestPage from './pages/homogeneity-test-page';
import SurvivalAnalysisPage from './pages/survival-analysis-page';
import GbmPage from './pages/gbm-page';
import SentimentAnalysisPage from './pages/sentiment-analysis-page';
import MetaAnalysisPage from './pages/meta-analysis-page';
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
import OneSampleTTestPage from './pages/one-sample-t-test-page';
import WordCloudPage from './pages/wordcloud-page';
import IpaPage from './pages/ipa-page';
import TurfPage from './pages/turf-page';
import HistoryPage from './pages/history-page';
import html2canvas from 'html2canvas';
import PanelDataRegressionPage from './pages/panel-data-regression-page';
import InstrumentalVariableRegressionPage from './pages/instrumental-variable-regression-page';
import TwoStageLeastSquaresPage from './pages/two-stage-least-squares-page';
import SpatialAutoregressiveModelPage from './pages/spatial-autoregressive-model-page';
import SpatialErrorModelPage from './pages/spatial-error-model-page';
import GeographicallyWeightedRegressionPage from './pages/geographically-weighted-regression-page';
import TimeSeriesCrossSectionalPage from './pages/time-series-cross-sectional-page';


const analysisCategories = [
    {
      name: 'Descriptive',
      icon: BarChart,
      items: [
        { id: 'descriptive-stats', label: 'Descriptive Statistics', icon: BarChart, component: DescriptiveStatisticsPage },
        { id: 'frequency-analysis', label: 'Frequency Analysis', icon: Users, component: FrequencyAnalysisPage },
      ],
    },
    {
      name: 'Comparison',
      icon: Users,
      subCategories: [
          {
            name: 'T-Tests',
            items: [
                { id: 't-test-one-sample', label: 'One-Sample T-Test', icon: Target, component: TTestPage },
                { id: 't-test-independent-samples', label: 'Independent Samples', icon: Users, component: TTestPage },
                { id: 't-test-paired-samples', label: 'Paired Samples', icon: Repeat, component: TTestPage },
            ]
          },
          {
            name: 'ANOVA',
            items: [
                { id: 'one-way-anova', label: 'One-Way ANOVA', icon: Users, component: AnovaPage },
                { id: 'two-way-anova', label: 'Two-Way ANOVA', icon: Copy, component: TwoWayAnovaPage },
                { id: 'ancova', label: 'ANCOVA', icon: Layers, component: AncovaPage },
                { id: 'manova', label: 'MANOVA', icon: Layers, component: ManovaPage },
                { id: 'repeated-measures-anova', label: 'Repeated Measures ANOVA', icon: Repeat, component: RepeatedMeasuresAnovaPage },
            ]
          }
      ]
    },
    {
      name: 'Relationship',
      icon: TrendingUp,
      items: [
        { id: 'correlation', label: 'Correlation', icon: Link2, component: CorrelationPage },
        { id: 'regression-simple', label: 'Simple Linear Regression', icon: TrendingUp, component: RegressionPage },
        { id: 'regression-multiple', label: 'Multiple Linear Regression', icon: TrendingUp, component: RegressionPage },
        { id: 'regression-polynomial', label: 'Polynomial Regression', icon: TrendingUp, component: RegressionPage },
        { id: 'logistic-regression', label: 'Logistic Regression', icon: Binary, component: LogisticRegressionPage },
        { id: 'crosstab', label: 'Crosstab & Chi-Squared', icon: Columns, component: CrosstabPage },
      ]
    },
    {
      name: 'Predictive',
      icon: Brain,
      items: [
          { id: 'glm', label: 'Generalized Linear Model (GLM)', icon: Scaling, component: GlmPage },
          { id: 'discriminant', label: 'Discriminant Analysis', icon: Users, component: DiscriminantPage },
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
            ]
          },
          {
            name: 'Path Analysis',
            items: [
              { id: 'mediation', label: 'Mediation Analysis', icon: GitBranch, component: MediationPage },
              { id: 'moderation', label: 'Moderation Analysis', icon: GitCommit, component: ModerationPage },
            ]
          },
      ]
    },
    {
        name: 'Clustering',
        icon: Users,
        items: [
            { id: 'kmeans', label: 'K-Means', icon: Binary, component: KMeansPage },
            { id: 'kmedoids', label: 'K-Medoids', icon: Binary, component: KMedoidsPage },
            { id: 'hca', label: 'Hierarchical (HCA)', icon: GitBranch, component: HcaPage },
            { id: 'dbscan', label: 'DBSCAN', icon: ScanSearch, component: DbscanPage },
            { id: 'hdbscan', label: 'HDBSCAN', icon: ScanSearch, component: HdbscanPage },
        ]
    },
    {
        name: 'Time Series',
        icon: LineChart,
        items: [
            { id: 'trend-analysis', label: 'Trend Analysis', icon: TrendingUp, component: TrendAnalysisPage },
            { id: 'seasonal-decomposition', label: 'Seasonal Decomposition', icon: AreaChart, component: SeasonalDecompositionPage },
            { id: 'acf-pacf', label: 'ACF/PACF Plots', icon: BarChart, component: AcfPacfPage },
            { id: 'stationarity', label: 'Stationarity Test (ADF)', icon: TrendingUp, component: StationarityPage },
            { id: 'ljung-box', label: 'Ljung-Box Test', icon: CheckSquare, component: LjungBoxPage },
            { id: 'arch-lm-test', label: 'ARCH-LM Test', icon: AlertTriangle, component: ArchLmTestPage },
            { id: 'exponential-smoothing', label: 'Exponential Smoothing', icon: LineChart, component: ExponentialSmoothingPage },
            { id: 'arima', label: 'ARIMA & SARIMAX', icon: TrendingUp, component: ArimaPage },
            { id: 'forecast-evaluation', label: 'Forecast Model Evaluation', icon: Target, component: ForecastEvaluationPage },
        ]
    },
    {
      name: 'Unstructured Data',
      icon: FileText,
      items: [
        { id: 'sentiment', label: 'Sentiment Analysis', icon: Smile, component: SentimentAnalysisPage },
        { id: 'topic-modeling', label: 'Topic Modeling (LDA)', icon: MessagesSquare, component: TopicModelingPage },
        { id: 'wordcloud', label: 'Word Cloud', icon: Feather, component: WordCloudPage },
      ]
    },
    {
        name: 'Assumptions',
        icon: CheckSquare,
        items: [
            { id: 'normality-test', label: 'Normality Test', icon: BarChart, component: NormalityTestPage },
            { id: 'homogeneity-test', label: 'Homogeneity of Variance', icon: Layers, component: HomogeneityTestPage },
        ],
    },
     {
        name: 'Marketing',
        icon: Target,
        items: [
            { id: 'ipa', label: 'IPA', icon: Target, component: IpaPage },
            { id: 'turf', label: 'TURF Analysis', icon: ThumbsUp, component: TurfPage },
        ],
    },
    {
      name: 'Applied Econometric Models',
      icon: Sigma,
      items: [
        { id: 'panel-data-regression', label: 'Panel Data Regression', icon: Users, component: PanelDataRegressionPage },
        { id: 'iv-regression', label: 'Instrumental Variable (IV)', icon: Link2, component: InstrumentalVariableRegressionPage },
        { id: 'two-stage-least-squares', label: 'Two-Stage Least Squares (2SLS)', icon: Repeat, component: TwoStageLeastSquaresPage },
        { id: 'spatial-autoregressive-model', label: 'Spatial Autoregressive (SAR)', icon: Map, component: SpatialAutoregressiveModelPage },
        { id: 'spatial-error-model', label: 'Spatial Error Model (SEM)', icon: Map, component: SpatialErrorModelPage },
        { id: 'geographically-weighted-regression', label: 'Geographically Weighted Regression', icon: Map, component: GeographicallyWeightedRegressionPage },
        { id: 'time-series-cross-sectional', label: 'Time-Series Cross-Sectional', icon: AreaChart, component: TimeSeriesCrossSectionalPage },
      ],
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
  const [activeAnalysis, setActiveAnalysis] = useState('descriptive-stats');
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const analysisPageRef = useRef<HTMLDivElement>(null);


  const { toast } = useToast();

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  };
  
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
    setActiveAnalysis('descriptive-stats');
  };

  const handleLoadExampleData = (example: ExampleDataSet) => {
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
      a.download = fileName.replace(/\.[^/.]+$/, "") + "_statistica.csv" || 'statistica_data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download data:', error);
      toast({ variant: 'destructive', title: 'Download Error', description: 'Could not prepare data for download.' });
    }
  };

  const handleDownloadAsPDF = async () => {
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
  };


  const handleGenerateReport = async (analysisType: string, stats: any, viz: string | null) => {
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

  const hasData = data.length > 0;
  
  const ActivePageComponent = useMemo(() => {
    if (activeAnalysis === 'history') return HistoryPage;
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
    return DescriptiveStatisticsPage;
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
             <div className='p-2'>
              <DataUploader 
                onFileSelected={handleFileSelected}
                loading={isUploading}
              />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {analysisCategories.map(category => (
                <Collapsible key={category.name} open={openCategories.includes(category.name)} onOpenChange={() => toggleCategory(category.name)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start text-base px-2">
                       <category.icon className="mr-2 h-5 w-5"/>
                       <span>{category.name}</span>
                       <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes(category.name) && 'rotate-180')}/>
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
                                <item.icon />
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
                                  <item.icon />
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
          <SidebarFooter>
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
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div ref={analysisPageRef} className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger className="md:hidden"/>
                <h1 className="text-2xl font-headline font-bold md:hidden">Statistica</h1>
                <div />
            </header>
            
            {hasData && (
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

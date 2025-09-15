
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
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import TwoWayAnovaPage from './pages/two-way-anova-page';
import MannWhitneyPage from './pages/mann-whitney-page';
import WilcoxonPage from './pages/wilcoxon-page';
import KruskalWallisPage from './pages/kruskal-wallis-page';
import FriedmanPage from './pages/friedman-page';

type AnalysisType = 'stats' | 'correlation' | 'one-way-anova' | 'two-way-anova' | 'ancova' | 'manova' | 'reliability' | 'visuals' | 'discriminant' | 'efa' | 'cfa' | 'mediation' | 'moderation' | 'mann-whitney' | 'wilcoxon' | 'kruskal-wallis' | 'friedman' | 'hca' | 't-test' | 'regression' | 'logistic-regression' | 'kmeans' | 'frequency' | 'crosstab' | 'sem' | 'conjoint' | 'ipa' | 'pca' | 'survival' | 'wordcloud' | 'gbm';

const analysisPages: Record<AnalysisType, React.ComponentType<any>> = {
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
    'mann-whitney': MannWhitneyPage,
    'wilcoxon': WilcoxonPage,
    'kruskal-wallis': KruskalWallisPage,
    'friedman': FriedmanPage,
    't-test': TTestPage,
    hca: HcaPage,
    manova: ManovaPage,
    regression: RegressionPage,
    'logistic-regression': LogisticRegressionPage,
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
};

const analysisMenu = [
  {
    field: 'Descriptive',
    icon: BarChart,
    methods: [
      { id: 'stats', label: 'Descriptive Statistics' },
      { id: 'frequency', label: 'Frequency Analysis' },
      { id: 'wordcloud', label: 'Word Cloud' },
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
          { id: 'mann-whitney', label: 'Mann-Whitney U' },
          { id: 'wilcoxon', label: 'Wilcoxon Signed-Rank' },
          { id: 'kruskal-wallis', label: 'Kruskal-Wallis' },
          { id: 'friedman', label: 'Friedman Test' },
        ]
      },
    ]
  },
  {
    field: 'Correlation / Regression',
    icon: Link2,
    methods: [
      { id: 'correlation', label: 'Correlation Analysis' },
      { id: 'regression', label: 'Regression Analysis' },
      { id: 'logistic-regression', label: 'Logistic Regression' },
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
    field: 'Specialized Models',
    icon: FlaskConical,
    methods: [
      { id: 'conjoint', label: 'Conjoint Analysis' },
      { id: 'ipa', label: 'Importance-Performance Analysis (IPA)' },
      { id: 'survival', label: 'Survival Analysis' },
      { id: 'gbm', label: 'GBM Analysis'},
      { id: 'decision-tree', label: 'Decision Tree', implemented: false },
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
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType | 'visuals'>('stats');
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
        // setActiveAnalysis('stats'); // Bug: This was resetting the view. Removed.

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
    processData(example.data, example.name);
    if(example.recommendedAnalysis) {
      setActiveAnalysis(example.recommendedAnalysis as AnalysisType);
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
  
  const ActivePageComponent = activeAnalysis && analysisPages[activeAnalysis as AnalysisType] 
    ? analysisPages[activeAnalysis as AnalysisType]
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
              {fileName && (
                <div className="mt-2 text-center">
                   <Button variant="link" size="sm" className="text-xs h-auto p-0 text-muted-foreground hover:text-primary" onClick={handleClearData}>
                    Clear data
                  </Button>
                </div>
              )}
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
                                  {sub.methods.map(method => (
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
            
            {hasData && activeAnalysis !== 'stats' && activeAnalysis !== 'wordcloud' && (
              <DataPreview 
                fileName={fileName}
                data={data}
                headers={allHeaders}
                onDownload={handleDownloadData}
              />
            )}
            
            <ActivePageComponent 
                key={activeAnalysis} 
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

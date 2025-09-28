
'use client';

import { useState, useMemo, useCallback } from 'react';
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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  FileText,
  Loader2,
  TrendingUp,
  BarChart,
  BarChart2,
  FileDown,
  Sigma,
  Calculator,
  ChevronDown
} from 'lucide-react';
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { cn } from '@/lib/utils';
import DescriptiveStatisticsPage from './pages/descriptive-stats-page';
import TTestPage from './pages/t-test-page';
import AnovaPage from './pages/anova-page';
import TwoWayAnovaPage from './pages/two-way-anova-page';
import AncovaPage from './pages/ancova-page';
import ManovaPage from './pages/manova-page';
import CorrelationPage from './pages/correlation-page';
import RegressionPage from './pages/regression-page';
import LogisticRegressionPage from './pages/logistic-regression-page';
import ReliabilityPage from './pages/reliability-page';
import EfaPage from './pages/efa-page';
import CfaPage from './pages/cfa-page';
import MediationPage from './pages/mediation-page';
import ModerationPage from './pages/moderation-page';
import NonParametricPage from './pages/nonparametric-page';
import CrosstabPage from './pages/crosstab-page';
import FrequencyAnalysisPage from './pages/frequency-analysis-page';
import NormalityTestPage from './pages/normality-test-page';
import HomogeneityTestPage from './pages/homogeneity-test-page';
import GlmPage from './pages/glm-page';
import TrendAnalysisPage from './pages/trend-analysis-page';
import SeasonalDecompositionPage from './pages/seasonal-decomposition-page';
import ExponentialSmoothingPage from './pages/exponential-smoothing-page';
import AcfPacfPage from './pages/acf-pacf-page';
import StationarityPage from './pages/stationarity-page';
import ArchLmTestPage from './pages/arch-lm-test-page';
import LjungBoxPage from './pages/ljung-box-page';
import ArimaPage from './pages/arima-page';
import ForecastEvaluationPage from './pages/forecast-evaluation-page';
import PartialCorrelationPage from './pages/partial-correlation-page';
import PcaPage from './pages/pca-page';
import MdsPage from './pages/mds-page';
import BinomialTestPage from './pages/binomial-test-page';
import RepeatedMeasuresAnovaPage from './pages/repeated-measures-anova-page';
import MixedModelPage from './pages/mixed-model-page';

type AnalysisType =
  | 'descriptive-stats' | 'frequency' | 'crosstab'
  | 't-test-one-sample' | 't-test-independent' | 't-test-paired'
  | 'one-way-anova' | 'two-way-anova' | 'ancova' | 'manova' | 'rm-anova'
  | 'correlation' | 'partial-correlation'
  | 'regression-simple' | 'regression-multiple' | 'regression-polynomial' | 'logistic-regression' | 'glm'
  | 'reliability' | 'efa' | 'cfa' | 'pca' | 'mds'
  | 'mediation' | 'moderation'
  | 'normality' | 'homogeneity'
  | 'nonparametric-mann-whitney' | 'nonparametric-wilcoxon' | 'nonparametric-kruskal-wallis' | 'nonparametric-friedman' | 'nonparametric-mcnemar'
  | 'trend' | 'seasonal-decomposition' | 'exponential-smoothing' | 'acf-pacf' | 'stationarity' | 'arch-lm' | 'ljung-box' | 'arima' | 'forecast-evaluation'
  | 'binomial-test' | 'mixed-model';

const analysisPages: { [key: string]: React.ComponentType<any> } = {
  'descriptive-stats': DescriptiveStatisticsPage,
  'frequency': FrequencyAnalysisPage,
  'crosstab': CrosstabPage,
  't-test-one-sample': TTestPage,
  't-test-independent': TTestPage,
  't-test-paired': TTestPage,
  'one-way-anova': AnovaPage,
  'two-way-anova': TwoWayAnovaPage,
  'ancova': AncovaPage,
  'manova': ManovaPage,
  'rm-anova': RepeatedMeasuresAnovaPage,
  'correlation': CorrelationPage,
  'partial-correlation': PartialCorrelationPage,
  'regression-simple': RegressionPage,
  'regression-multiple': RegressionPage,
  'regression-polynomial': RegressionPage,
  'logistic-regression': LogisticRegressionPage,
  'glm': GlmPage,
  'reliability': ReliabilityPage,
  'efa': EfaPage,
  'cfa': CfaPage,
  'pca': PcaPage,
  'mds': MdsPage,
  'mediation': MediationPage,
  'moderation': ModerationPage,
  'normality': NormalityTestPage,
  'homogeneity': HomogeneityTestPage,
  'nonparametric-mann-whitney': NonParametricPage,
  'nonparametric-wilcoxon': NonParametricPage,
  'nonparametric-kruskal-wallis': NonParametricPage,
  'nonparametric-friedman': NonParametricPage,
  'nonparametric-mcnemar': NonParametricPage,
  'trend': TrendAnalysisPage,
  'seasonal-decomposition': SeasonalDecompositionPage,
  'exponential-smoothing': ExponentialSmoothingPage,
  'acf-pacf': AcfPacfPage,
  'stationarity': StationarityPage,
  'arch-lm': ArchLmTestPage,
  'ljung-box': LjungBoxPage,
  'arima': ArimaPage,
  'forecast-evaluation': ForecastEvaluationPage,
  'binomial-test': BinomialTestPage,
  'mixed-model': MixedModelPage,
};


const analysisCategories = [
    { name: 'Descriptive', analyses: ['descriptive-stats', 'frequency', 'crosstab'] },
    { name: 'T-Tests', analyses: ['t-test-one-sample', 't-test-independent', 't-test-paired'] },
    { name: 'ANOVA', analyses: ['one-way-anova', 'two-way-anova', 'ancova', 'manova', 'rm-anova'] },
    { name: 'Correlation', analyses: ['correlation', 'partial-correlation'] },
    { name: 'Regression', analyses: ['regression-simple', 'regression-multiple', 'regression-polynomial', 'logistic-regression', 'glm'] },
    { name: 'Factor/Dimension', analyses: ['reliability', 'efa', 'pca', 'mds'] },
    { name: 'Causal Inference', analyses: ['mediation', 'moderation'] },
    { name: 'Assumption Tests', analyses: ['normality', 'homogeneity'] },
    { name: 'Non-Parametric', analyses: ['nonparametric-mann-whitney', 'nonparametric-wilcoxon', 'nonparametric-kruskal-wallis', 'nonparametric-friedman', 'nonparametric-mcnemar'] },
    { name: 'Time Series', analyses: ['trend', 'seasonal-decomposition', 'exponential-smoothing', 'acf-pacf', 'stationarity', 'arch-lm', 'ljung-box', 'arima', 'forecast-evaluation'] },
    { name: 'Other', analyses: ['binomial-test', 'mixed-model'] },
]

export default function StatisticaApp() {
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
  const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [report, setReport] = useState<{ title: string, content: string } | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType>('descriptive-stats');
  const [openCategories, setOpenCategories] = useState<string[]>(['Descriptive', 'T-Tests', 'ANOVA']);

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
    const vizString = "Statistical visualizations for the loaded data.";

    const result = await getSummaryReport({ statistics: statsString, visualizations: vizString });
    if (result.success && result.report) {
      setReport({ title: 'Statistical Analysis Report', content: result.report });
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
  
  const hasData = data.length > 0;
  const ActivePageComponent = analysisPages[activeAnalysis] || DescriptiveStatisticsPage;
  
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  };
  
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
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-2 p-2">
            <div className='p-2'>
              <DataUploader 
                onFileSelected={handleFileSelected}
                loading={isUploading}
              />
            </div>
            <SidebarMenu>
                {analysisCategories.map(cat => (
                    <Collapsible key={cat.name} open={openCategories.includes(cat.name)} onOpenChange={() => toggleCategory(cat.name)}>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start text-base px-2">
                                {cat.name}
                                <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes(cat.name) && 'rotate-180')}/>
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenu>
                                {cat.analyses.map(analysis => (
                                    <SidebarMenuItem key={analysis}>
                                        <SidebarMenuButton onClick={() => setActiveAnalysis(analysis as AnalysisType)} isActive={activeAnalysis === analysis}>
                                            {analysis.replace(/-/g, ' ').replace(/\b\w/g, c=>c.toUpperCase())}
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </SidebarMenu>
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
                activeAnalysis={activeAnalysis}
              />
          </div>
        </SidebarInset>
      </div>

      <Dialog open={!!report} onOpenChange={(open) => !open && setReport(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline">{report?.title}</DialogTitle>
            <DialogDescription>
              An AI-generated summary of your statistical analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-h-[60vh] overflow-y-auto rounded-md border p-4 whitespace-pre-wrap">
            {report?.content}
          </div>
          <DialogFooter>
            <Button onClick={downloadReport}>
                <FileDown className="mr-2"/> Download Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

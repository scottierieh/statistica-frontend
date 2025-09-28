
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  FileText,
  Loader2,
  UploadCloud,
  File,
  BarChart2,
  Calculator,
  ChevronDown,
  HelpCircle
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

// Dynamically import pages to prevent build issues if they are not ready
const DescriptiveStatisticsPage = dynamic(() => import('./pages/descriptive-stats-page'), { ssr: false });
const TTestPage = dynamic(() => import('./pages/t-test-page'), { ssr: false });
const AnovaPage = dynamic(() => import('./pages/anova-page'), { ssr: false });
const TwoWayAnovaPage = dynamic(() => import('./pages/two-way-anova-page'), { ssr: false });
const CorrelationPage = dynamic(() => import('./pages/correlation-page'), { ssr: false });
const RegressionPage = dynamic(() => import('./pages/regression-page'), { ssr: false });
const LogisticRegressionPage = dynamic(() => import('./pages/logistic-regression-page'), { ssr: false });
const ReliabilityPage = dynamic(() => import('./pages/reliability-page'), { ssr: false });
const CrosstabPage = dynamic(() => import('./pages/crosstab-page'), { ssr: false });
const FrequencyAnalysisPage = dynamic(() => import('./pages/frequency-analysis-page'), { ssr: false });
const AncovaPage = dynamic(() => import('./pages/ancova-page'), { ssr: false });
const ManovaPage = dynamic(() => import('./pages/manova-page'), { ssr: false });
const MediationPage = dynamic(() => import('./pages/mediation-page'), { ssr: false });
const ModerationPage = dynamic(() => import('./pages/moderation-page'), { ssr: false });
const EfaPage = dynamic(() => import('./pages/efa-page'), { ssr: false });
const CfaPage = dynamic(() => import('./pages/cfa-page'), { ssr: false });
const SemPage = dynamic(() => import('./pages/sem-page'), { ssr: false });
const GlmPage = dynamic(() => import('./pages/glm-page'), { ssr: false });
const NormalityTestPage = dynamic(() => import('./pages/normality-test-page'), { ssr: false });
const HomogeneityTestPage = dynamic(() => import('./pages/homogeneity-test-page'), { ssr: false });
const NonParametricPage = dynamic(() => import('./pages/nonparametric-page'), { ssr: false });

type AnalysisType =
  | 'descriptive-stats' | 'correlation' | 't-test-one-sample' | 't-test-independent' | 't-test-paired'
  | 'one-way-anova' | 'two-way-anova' | 'ancova' | 'manova' | 'rm-anova'
  | 'regression-simple' | 'regression-multiple' | 'regression-polynomial' | 'logistic-regression' | 'glm'
  | 'reliability' | 'efa' | 'cfa' | 'sem' | 'mediation' | 'moderation'
  | 'frequency' | 'crosstab' | 'normality-test' | 'homogeneity-test'
  | 'nonparametric-mann-whitney' | 'nonparametric-wilcoxon' | 'nonparametric-kruskal-wallis' | 'nonparametric-friedman' | 'nonparametric-mcnemar';


const analysisPages: Record<string, React.ComponentType<any>> = {
  'descriptive-stats': DescriptiveStatisticsPage,
  'correlation': CorrelationPage,
  't-test-one-sample': TTestPage,
  't-test-independent': TTestPage,
  't-test-paired': TTestPage,
  'one-way-anova': AnovaPage,
  'two-way-anova': TwoWayAnovaPage,
  'ancova': AncovaPage,
  'manova': ManovaPage,
  'rm-anova': NonParametricPage,
  'regression-simple': RegressionPage,
  'regression-multiple': RegressionPage,
  'regression-polynomial': RegressionPage,
  'logistic-regression': LogisticRegressionPage,
  'glm': GlmPage,
  'reliability': ReliabilityPage,
  'efa': EfaPage,
  'cfa': CfaPage,
  'sem': SemPage,
  'mediation': MediationPage,
  'moderation': ModerationPage,
  'frequency': FrequencyAnalysisPage,
  'crosstab': CrosstabPage,
  'normality-test': NormalityTestPage,
  'homogeneity-test': HomogeneityTestPage,
  'nonparametric-mann-whitney': NonParametricPage,
  'nonparametric-wilcoxon': NonParametricPage,
  'nonparametric-kruskal-wallis': NonParametricPage,
  'nonparametric-friedman': NonParametricPage,
  'nonparametric-mcnemar': NonParametricPage,
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
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType>('descriptive-stats');
  const [openCategories, setOpenCategories] = useState<string[]>(['Descriptive Statistics']);

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
      a.download = fileName.replace(/\.[^/.]+$/, "") + ".csv" || 'data.csv';
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
    a.download = 'statistical_report.txt';
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
  
  const menuCategories = [
      { name: 'Descriptive Statistics', children: [ { id: 'descriptive-stats', label: 'Summary Statistics' }, { id: 'frequency', label: 'Frequency Analysis' } ]},
      { name: 'Assumption Tests', children: [ { id: 'normality-test', label: 'Normality Test' }, { id: 'homogeneity-test', label: 'Homogeneity of Variance' }]},
      { name: 'Group Comparison', children: [ { id: 't-test-one-sample', label: 'One-Sample T-Test'}, { id: 't-test-independent', label: 'Independent Samples T-Test' }, { id: 't-test-paired', label: 'Paired Samples T-Test' }, { id: 'one-way-anova', label: 'One-Way ANOVA' }, { id: 'two-way-anova', label: 'Two-Way ANOVA' }, { id: 'ancova', label: 'ANCOVA' }, { id: 'manova', label: 'MANOVA' }, { id: 'rm-anova', label: 'Repeated Measures ANOVA' }]},
      { name: 'Non-Parametric Tests', children: [ { id: 'nonparametric-mann-whitney', label: 'Mann-Whitney U Test' }, { id: 'nonparametric-wilcoxon', label: 'Wilcoxon Signed-Rank' }, { id: 'nonparametric-kruskal-wallis', label: 'Kruskal-Wallis H Test' }, { id: 'nonparametric-friedman', label: 'Friedman Test' }, { id: 'nonparametric-mcnemar', label: "McNemar's Test" }]},
      { name: 'Correlation & Regression', children: [ { id: 'correlation', label: 'Correlation' }, { id: 'regression-simple', label: 'Simple Linear Regression' }, { id: 'regression-multiple', label: 'Multiple Linear Regression' }, { id: 'regression-polynomial', label: 'Polynomial Regression' }, { id: 'logistic-regression', label: 'Logistic Regression' }, { id: 'glm', label: 'Generalized Linear Models (GLM)' }]},
      { name: 'Scale & Latent Variable', children: [ { id: 'reliability', label: 'Reliability (Cronbach\'s Alpha)' }, { id: 'efa', label: 'Exploratory Factor Analysis' }, { id: 'cfa', label: 'Confirmatory Factor Analysis' }, { id: 'sem', label: 'Structural Equation Modeling' }]},
      { name: 'Causal & Effect', children: [ { id: 'mediation', label: 'Mediation Analysis' }, { id: 'moderation', label: 'Moderation Analysis' }]},
  ];

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
                 {menuCategories.map(category => (
                    <Collapsible key={category.name} open={openCategories.includes(category.name)} onOpenChange={() => toggleCategory(category.name)}>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start text-base px-2">
                                {category.name}
                                <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes(category.name) && 'rotate-180')}/>
                            </Button>
                        </CollapsibleTrigger>
                         <CollapsibleContent>
                            <SidebarMenu>
                                {category.children.map(item => (
                                    <SidebarMenuItem key={item.id}>
                                        <SidebarMenuButton onClick={() => setActiveAnalysis(item.id as AnalysisType)} isActive={activeAnalysis === item.id}>
                                            {item.label}
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
            <Button onClick={downloadReport}>Download as .txt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

    
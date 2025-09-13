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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Calculator,
  FileText,
  Loader2,
  Link2,
  SigmaSquare,
  BarChart2,
  Sigma,
  ChevronDown,
  PieChart,
  Bot,
  BrainCircuit,
  Presentation,
  Book,
  Network,
  FlaskConical,
} from 'lucide-react';
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
import VisualizationPage from './pages/visualization-page';
import { type ExampleDataSet } from '@/lib/example-datasets';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type AnalysisType = 'stats' | 'correlation' | 'anova' | 'visuals';

const analysisPages: Record<AnalysisType, React.ComponentType<any>> = {
    stats: DescriptiveStatsPage,
    correlation: CorrelationPage,
    anova: AnovaPage,
    visuals: VisualizationPage,
};

const analysisMenu = [
  {
    field: 'Basic Statistics / Tests',
    icon: Sigma,
    methods: [
      { id: 'stats', label: 'Descriptive Statistics', implemented: true },
      { id: 'frequency', label: 'Frequency Analysis', implemented: false },
      { id: 'crosstab', label: 'Crosstab Analysis', implemented: false },
      { id: 'ttest', label: 't-test', implemented: false },
      { id: 'anova', label: 'ANOVA', implemented: true },
    ]
  },
  {
    field: 'Correlation / Regression',
    icon: Link2,
    methods: [
      { id: 'correlation', label: 'Correlation Analysis', implemented: true },
      { id: 'linear-regression', label: 'Linear Regression', implemented: false },
      { id: 'logistic-regression', label: 'Logistic Regression', implemented: false },
    ]
  },
   {
    field: 'Visualization',
    icon: BarChart2,
    methods: [
      { id: 'visuals', label: 'Data Visualization', implemented: true },
    ]
  },
  {
    field: 'Factor / Dimension Reduction',
    icon: BrainCircuit,
    methods: [
      { id: 'pca', label: 'PCA', implemented: false },
      { id: 'efa', label: 'EFA', implemented: false },
    ]
  },
  {
    field: 'Clustering / Classification',
    icon: PieChart,
    methods: [
      { id: 'kmeans', label: 'K-means Clustering', implemented: false },
      { id: 'decision-tree', label: 'Decision Tree', implemented: false },
    ]
  },
  {
    field: 'Machine Learning / AI',
    icon: Bot,
    methods: [
      { id: 'random-forest', label: 'Random Forest', implemented: false },
      { id: 'svm', label: 'Support Vector Machine', implemented: false },
    ]
  },
    {
    field: 'Marketing / Management',
    icon: Presentation,
    methods: [
        { id: 'conjoint', label: 'Conjoint Analysis', implemented: false },
        { id: 'rfm', label: 'RFM Analysis', implemented: false },
    ]
  },
  {
    field: 'Text / Network',
    icon: Network,
    methods: [
      { id: 'sentiment', label: 'Sentiment Analysis', implemented: false },
      { id: 'topic-modeling', label: 'Topic Modeling', implemented: false },
    ]
  },
  {
    field: 'Advanced / Specialized',
    icon: FlaskConical,
    methods: [
      { id: 'bayesian', label: 'Bayesian Inference', implemented: false },
      { id: 'survival', label: 'Survival Analysis', implemented: false },
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
  const [openCategories, setOpenCategories] = useState<string[]>(['Basic Statistics / Tests', 'Correlation / Regression', 'Visualization']);


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

  const handleFileSelected = (file: File) => {
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv') && file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please upload a CSV or TXT file.',
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      processData(content, file.name);
    };
    reader.onerror = () => {
        toast({variant: 'destructive', title: 'File Read Error', description: 'An error occurred while reading the file.'});
    }
    reader.readAsText(file);
  };


  const handleLoadExampleData = (example: ExampleDataSet) => {
    processData(example.data, example.name);
  };
  
  const handleClearData = () => {
    setData([]);
    setAllHeaders([]);
    setNumericHeaders([]);
    setCategoricalHeaders([]);
    setFileName('');
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
      a.download = fileName || 'statistica_data.csv';
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
  
  const ActivePageComponent = activeAnalysis ? analysisPages[activeAnalysis as AnalysisType] : DescriptiveStatsPage;

  const hasData = data.length > 0;
  
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

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
              {fileName && (
                <div className="mt-2 text-center">
                   <Button variant="link" size="sm" className="text-xs h-auto p-0 text-muted-foreground hover:text-primary" onClick={handleClearData}>
                    Clear data
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {analysisMenu.map((category) => {
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
                    <CollapsibleContent className="pl-6 py-1 space-y-1">
                      {category.methods.map(method => (
                        <SidebarMenuItem key={method.id}>
                            <SidebarMenuButton
                                onClick={() => setActiveAnalysis(method.id as AnalysisType)}
                                isActive={activeAnalysis === method.id}
                                disabled={!method.implemented}
                                className="justify-start w-full h-8 text-xs"
                            >
                                <span>{method.label}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
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
            
            {hasData && (
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

'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Calculator,
  Upload,
  FileText,
  Trash2,
  Loader2,
  Sigma,
  Link2,
  SigmaSquare,
  BarChart2
} from 'lucide-react';
import {
  type DataSet,
  parseData,
} from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { getSummaryReport } from '@/app/actions';
import DescriptiveStatsPage from './pages/descriptive-stats-page';
import CorrelationPage from './pages/correlation-page';
import AnovaPage from './pages/anova-page';
import VisualizationPage from './pages/visualization-page';

type AnalysisType = 'stats' | 'correlation' | 'anova' | 'visuals';

const analysisPages: Record<AnalysisType, React.ComponentType<any>> = {
    stats: DescriptiveStatsPage,
    correlation: CorrelationPage,
    anova: AnovaPage,
    visuals: VisualizationPage,
};

const analysisInfo = {
    stats: { icon: Sigma, label: '기술 통계 분석' },
    correlation: { icon: Link2, label: '상관 관계 분석' },
    anova: { icon: SigmaSquare, label: '분산 분석 (ANOVA)' },
    visuals: { icon: BarChart2, label: '데이터 시각화' },
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
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType>('stats');

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && file.type !== 'text/plain') {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please upload a CSV or TXT file.',
      });
      return;
    }
    
    setIsUploading(true);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const { headers: newHeaders, data: newData, numericHeaders: newNumericHeaders, categoricalHeaders: newCategoricalHeaders } = parseData(content);
        
        if (newData.length === 0 || newHeaders.length === 0) {
          throw new Error("No valid data found in the file.");
        }
        setData(newData);
        setAllHeaders(newHeaders);
        setNumericHeaders(newNumericHeaders);
        setCategoricalHeaders(newCategoricalHeaders);
        setActiveAnalysis('stats');

      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error Processing File',
          description: error.message || 'Could not parse the file. Please check the format.',
        });
        handleClearData();
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };
  
  const triggerFileUpload = () => fileInputRef.current?.click();

  const handleClearData = () => {
    setData([]);
    setAllHeaders([]);
    setNumericHeaders([]);
    setCategoricalHeaders([]);
    setFileName('');
    setActiveAnalysis('stats');
  };

  const handleGenerateReport = async () => {
    if (data.length === 0) {
      toast({ title: 'No data to report', description: 'Please upload a file first.' });
      return;
    }
    setIsGeneratingReport(true);
    // This is a simplified version. A real implementation might want to gather
    // results from all analysis pages.
    const statsString = `Data with columns: ${allHeaders.join(', ')}`;
    const vizString = "Visualizations for the loaded data.";

    const result = await getSummaryReport({ statistics: statsString, visualizations: vizString });
    if (result.success && result.report) {
      setReport({ title: 'Summary Report', content: result.report });
    } else {
      toast({ variant: 'destructive', title: 'Report Generation Failed', description: result.error });
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
  
  const ActivePageComponent = analysisPages[activeAnalysis];

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
          <SidebarContent className="flex flex-col">
            <div className='p-2'>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.txt" className="hidden" />
              <Button onClick={triggerFileUpload} className="w-full" disabled={isUploading}>
                {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
                {isUploading ? 'Processing...' : 'Upload Data'}
              </Button>
              {fileName && <p className="mt-2 text-xs text-muted-foreground text-center truncate">File: {fileName}</p>}
            </div>
            
            {data.length > 0 && (
                <SidebarMenu>
                    {(Object.keys(analysisInfo) as AnalysisType[]).map(key => {
                        const Icon = analysisInfo[key].icon;
                        return (
                            <SidebarMenuItem key={key}>
                                <SidebarMenuButton
                                    onClick={() => setActiveAnalysis(key)}
                                    isActive={activeAnalysis === key}
                                >
                                    <Icon />
                                    <span>{analysisInfo[key].label}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    })}
                </SidebarMenu>
            )}

          </SidebarContent>
          <SidebarFooter>
            <Button onClick={handleGenerateReport} disabled={isGeneratingReport || data.length === 0} className="w-full">
              {isGeneratingReport ? <Loader2 className="animate-spin" /> : <FileText />}
              {isGeneratingReport ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button variant="destructive" onClick={handleClearData} className="w-full" disabled={data.length === 0}>
              <Trash2 />
              Clear Data
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col">
            <header className="flex items-center justify-between md:justify-end mb-4">
                <SidebarTrigger className="md:hidden"/>
                <h1 className="text-2xl font-headline font-bold md:hidden">Statistica</h1>
                <div />
            </header>
            
            {data.length > 0 ? (
              <ActivePageComponent 
                key={activeAnalysis} // Add key to force re-mount on analysis change
                data={data}
                allHeaders={allHeaders}
                numericHeaders={numericHeaders}
                categoricalHeaders={categoricalHeaders}
               />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center shadow-lg">
                  <CardHeader>
                    <CardTitle className="font-headline text-3xl">Welcome to Statistica</CardTitle>
                    <CardDescription>Your intelligent partner for statistical analysis.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <Image
                      src={PlaceHolderImages[0].imageUrl}
                      alt={PlaceHolderImages[0].description}
                      width={600}
                      height={400}
                      data-ai-hint={PlaceHolderImages[0].imageHint}
                      className="rounded-lg object-cover"
                    />
                    <p className="max-w-md text-muted-foreground">
                      To get started, upload a CSV or TXT file with your numerical data using the button in the sidebar.
                    </p>
                    <Button onClick={triggerFileUpload} size="lg">
                      <Upload className="mr-2 h-5 w-5" />
                      Upload Your First File
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
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

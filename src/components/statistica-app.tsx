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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';

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
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType | null>(null);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const processData = useCallback((content: string, name: string) => {
    try {
        const { headers: newHeaders, data: newData, numericHeaders: newNumericHeaders, categoricalHeaders: newCategoricalHeaders } = parseData(content);
        
        if (newData.length === 0 || newHeaders.length === 0) {
          throw new Error("파일에서 유효한 데이터를 찾을 수 없습니다.");
        }
        setData(newData);
        setAllHeaders(newHeaders);
        setNumericHeaders(newNumericHeaders);
        setCategoricalHeaders(newCategoricalHeaders);
        setActiveAnalysis('stats');
        setFileName(name);

      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: '파일 처리 오류',
          description: error.message || '파일을 파싱할 수 없습니다. 형식을 확인해주세요.',
        });
        handleClearData();
      }
  }, [toast]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv') && file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      toast({
        variant: 'destructive',
        title: '잘못된 파일 형식',
        description: 'CSV 또는 TXT 파일을 업로드해주세요.',
      });
      return;
    }
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      processData(content, file.name);
      setIsUploading(false);
    };
    reader.onerror = () => {
        toast({variant: 'destructive', title: '파일 읽기 오류', description: '파일을 읽는 중에 오류가 발생했습니다.'});
        setIsUploading(false);
    }
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

  const handleLoadExampleData = (example: ExampleDataSet) => {
    processData(example.data, example.name);
  };
  
  const triggerFileUpload = () => fileInputRef.current?.click();

  const handleClearData = () => {
    setData([]);
    setAllHeaders([]);
    setNumericHeaders([]);
    setCategoricalHeaders([]);
    setFileName('');
    setActiveAnalysis(null);
  };

  const handleGenerateReport = async () => {
    if (data.length === 0) {
      toast({ title: '보고할 데이터 없음', description: '먼저 파일을 업로드해주세요.' });
      return;
    }
    setIsGeneratingReport(true);
    // This is a simplified version. A real implementation might want to gather
    // results from all analysis pages.
    const statsString = `로드된 데이터의 열: ${allHeaders.join(', ')}`;
    const vizString = "로드된 데이터에 대한 시각화.";

    const result = await getSummaryReport({ statistics: statsString, visualizations: vizString });
    if (result.success && result.report) {
      setReport({ title: '요약 보고서', content: result.report });
    } else {
      toast({ variant: 'destructive', title: '보고서 생성 실패', description: result.error });
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
  
  const ActivePageComponent = activeAnalysis ? analysisPages[activeAnalysis] : null;

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
                {isUploading ? '처리 중...' : '데이터 업로드'}
              </Button>
              {fileName && <p className="mt-2 text-xs text-muted-foreground text-center truncate">파일: {fileName}</p>}
            </div>
            
            <SidebarMenu>
                {(Object.keys(analysisInfo) as AnalysisType[]).map(key => {
                    const Icon = analysisInfo[key].icon;
                    return (
                        <SidebarMenuItem key={key}>
                            <SidebarMenuButton
                                onClick={() => setActiveAnalysis(key)}
                                isActive={activeAnalysis === key}
                                disabled={data.length === 0 && activeAnalysis !== key}
                            >
                                <Icon />
                                <span>{analysisInfo[key].label}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )
                })}
            </SidebarMenu>

          </SidebarContent>
          <SidebarFooter>
            <Button onClick={handleGenerateReport} disabled={isGeneratingReport || data.length === 0} className="w-full">
              {isGeneratingReport ? <Loader2 className="animate-spin" /> : <FileText />}
              {isGeneratingReport ? '생성 중...' : '보고서 생성'}
            </Button>
            <Button variant="destructive" onClick={handleClearData} className="w-full" disabled={data.length === 0}>
              <Trash2 />
              데이터 지우기
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
            
            {ActivePageComponent ? (
              <ActivePageComponent 
                key={activeAnalysis} // Add key to force re-mount on analysis change
                data={data}
                allHeaders={allHeaders}
                numericHeaders={numericHeaders}
                categoricalHeaders={categoricalHeaders}
               />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-4xl text-center shadow-lg">
                  <CardHeader>
                    <CardTitle className="font-headline text-3xl">Statistica에 오신 것을 환영합니다</CardTitle>
                    <CardDescription>통계 분석을 위한 지능형 파트너입니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-6">
                    <Image
                      src={PlaceHolderImages[0].imageUrl}
                      alt={PlaceHolderImages[0].description}
                      width={600}
                      height={400}
                      data-ai-hint={PlaceHolderImages[0].imageHint}
                      className="rounded-lg object-cover"
                    />
                    <p className="max-w-md text-muted-foreground">
                      시작하려면 CSV 또는 TXT 파일을 업로드하거나 아래의 예제 데이터셋 중 하나를 선택하세요.
                    </p>
                    <Button onClick={triggerFileUpload} size="lg" className="w-full max-w-xs">
                      <Upload className="mr-2 h-5 w-5" />
                      첫 파일 업로드하기
                    </Button>

                    <div className="w-full pt-4">
                        <h3 className="mb-4 text-lg font-medium text-muted-foreground">또는 예제 데이터셋으로 시작해보세요:</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {exampleDatasets.map((ex) => {
                                const Icon = ex.icon;
                                return (
                                <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                            <Icon className="h-6 w-6 text-secondary-foreground" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-semibold">{ex.name}</CardTitle>
                                            <CardDescription className="text-xs">{ex.description}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardFooter>
                                        <Button onClick={() => handleLoadExampleData(ex)} className="w-full">
                                            이 데이터 로드
                                        </Button>
                                    </CardFooter>
                                </Card>
                                )
                            })}
                        </div>
                    </div>
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
              데이터 분석에 대한 AI 생성 요약입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-h-[60vh] overflow-y-auto rounded-md border p-4 whitespace-pre-wrap">
            {report?.content}
          </div>
          <DialogFooter>
            <Button onClick={downloadReport}>.txt로 다운로드</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

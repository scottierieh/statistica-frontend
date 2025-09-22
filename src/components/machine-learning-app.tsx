

'use client';

import { useState, useCallback } from 'react';
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
  SidebarMenuSub,
  SidebarMenuSubButton
} from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  BrainCircuit,
  TrendingUp,
  Binary,
  GitBranch,
  Users,
  Layers,
  Container,
} from 'lucide-react';
import DeepLearningApp from './deep-learning-app';
import KnnRegressionPage from './pages/knn-regression-page';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';
import { useToast } from '@/hooks/use-toast';
import { DataSet, parseData, unparseData } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import * as XLSX from 'xlsx';
import RidgeRegressionPage from './pages/ridge-regression-page';
import LassoRegressionPage from './pages/lasso-regression-page';
import FruitClusteringPage from './pages/fruit-clustering-page';

type MLTaskType = 'regression' | 'classification' | 'tree' | 'unsupervised' | 'deep-learning' | 'knn-regression-simple' | 'knn-regression-multiple' | 'ridge-regression' | 'lasso-regression' | 'fruit-clustering';

const MachineLearningContent = ({ activeTask, data, numericHeaders, onLoadExample, allHeaders, categoricalHeaders }: { activeTask: MLTaskType, data: DataSet, numericHeaders: string[], onLoadExample: (e: ExampleDataSet) => void, allHeaders: string[], categoricalHeaders: string[] }) => {
    switch (activeTask) {
        case 'deep-learning':
            return <DeepLearningApp />;
        case 'knn-regression-simple':
            return <KnnRegressionPage data={data} numericHeaders={numericHeaders} onLoadExample={onLoadExample} mode="simple" />;
        case 'knn-regression-multiple':
             return <KnnRegressionPage data={data} numericHeaders={numericHeaders} onLoadExample={onLoadExample} mode="multiple" />;
        case 'ridge-regression':
            return <RidgeRegressionPage data={data} numericHeaders={numericHeaders} onLoadExample={onLoadExample} />;
        case 'lasso-regression':
            return <LassoRegressionPage data={data} numericHeaders={numericHeaders} onLoadExample={onLoadExample} />;
        case 'fruit-clustering':
            return <FruitClusteringPage />;
        case 'regression':
        case 'classification':
        case 'tree':
        case 'unsupervised':
        default:
            return (
                <div className="flex flex-1 items-center justify-center h-full">
                    <Card className="w-full max-w-2xl text-center">
                        <CardHeader>
                            <CardTitle className="font-headline capitalize">{activeTask.replace('-', ' ')}</CardTitle>
                            <CardDescription>
                                This machine learning tool is under construction.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Stay tuned for powerful new capabilities!</p>
                        </CardContent>
                    </Card>
                </div>
            );
    }
};

export default function MachineLearningApp() {
  const [activeTask, setActiveTask] = useState<MLTaskType>('knn-regression-simple');
  const { toast } = useToast();
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
  const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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
      setActiveTask(example.recommendedAnalysis as MLTaskType);
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
  
  const hasData = data.length > 0;
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <BrainCircuit className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Machine Learning</h1>
            </div>
             <div className='p-2'>
              <DataUploader 
                onFileSelected={handleFileSelected}
                loading={isUploading}
              />
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-2 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {}}
                  isActive={activeTask.includes('regression')}
                >
                  <TrendingUp />
                  <span>회귀 알고리즘</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                    <SidebarMenuItem>
                        <SidebarMenuSubButton
                          onClick={() => setActiveTask('knn-regression-simple')}
                          isActive={activeTask === 'knn-regression-simple'}
                        >
                          Simple KNN Regression
                        </SidebarMenuSubButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuSubButton
                          onClick={() => setActiveTask('knn-regression-multiple')}
                          isActive={activeTask === 'knn-regression-multiple'}
                        >
                          Multiple KNN Regression
                        </SidebarMenuSubButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                        <SidebarMenuSubButton
                          onClick={() => setActiveTask('ridge-regression')}
                          isActive={activeTask === 'ridge-regression'}
                        >
                          Ridge Regression
                        </SidebarMenuSubButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuSubButton
                          onClick={() => setActiveTask('lasso-regression')}
                          isActive={activeTask === 'lasso-regression'}
                        >
                          Lasso Regression
                        </SidebarMenuSubButton>
                    </SidebarMenuItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveTask('classification')}
                  isActive={activeTask === 'classification'}
                >
                  <Binary />
                  <span>분류 알고리즘</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveTask('tree')}
                  isActive={activeTask === 'tree'}
                >
                  <GitBranch />
                  <span>트리 알고리즘</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {}}
                  isActive={activeTask.includes('unsupervised') || activeTask.includes('fruit-clustering')}
                >
                  <Users />
                  <span>비지도 학습</span>
                </SidebarMenuButton>
                 <SidebarMenuSub>
                    <SidebarMenuItem>
                        <SidebarMenuSubButton
                          onClick={() => setActiveTask('fruit-clustering')}
                          isActive={activeTask === 'fruit-clustering'}
                        >
                          과일 이미지 군집 분석
                        </SidebarMenuSubButton>
                    </SidebarMenuItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveTask('deep-learning')}
                  isActive={activeTask === 'deep-learning'}
                >
                  <Layers />
                  <span>딥러닝</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger className="md:hidden"/>
                <h1 className="text-2xl font-headline font-bold md:hidden">Machine Learning</h1>
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
            
            <MachineLearningContent 
                activeTask={activeTask}
                data={data}
                numericHeaders={numericHeaders}
                categoricalHeaders={categoricalHeaders}
                allHeaders={allHeaders}
                onLoadExample={handleLoadExampleData}
             />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}


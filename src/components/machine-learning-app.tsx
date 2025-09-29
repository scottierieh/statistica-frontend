
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  BrainCircuit,
  TrendingUp,
  Binary,
  GitBranch,
  Users,
  Layers,
  Container,
  ChevronDown,
} from 'lucide-react';
import DeepLearningApp from './deep-learning-app';
import KnnRegressionPage from '@/components/pages/knn-regression-page';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';
import { useToast } from '@/hooks/use-toast';
import { DataSet, parseData, unparseData } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import * as XLSX from 'xlsx';
import RidgeRegressionPage from '@/components/pages/ridge-regression-page';
import LassoRegressionPage from '@/components/pages/lasso-regression-page';
import FruitClusteringPage from '@/components/pages/fruit-clustering-page';
import DecisionTreePage from '@/components/pages/decision-tree-page';
import ClassifierComparisonPage from '@/components/pages/classifier-comparison-page';
import { cn } from '@/lib/utils';
import HcaPage from '@/components/pages/hca-page';
import HcaComparisonPage from '@/components/pages/hca-comparison-page';
import DiscriminantComparisonPage from './pages/discriminant-comparison-page';
import PcaLdaComparisonPage from './pages/pca-lda-comparison-page';

type MLTaskType = 'regression' | 'classification' | 'tree' | 'unsupervised' | 'deep-learning' | 'knn-regression-simple' | 'knn-regression-multiple' | 'ridge-regression' | 'lasso-regression' | 'fruit-clustering' | 'decision-tree-classifier' | 'classifier-comparison' | 'hca' | 'hca-comparison' | 'discriminant-comparison' | 'pca-lda-comparison';

const MachineLearningContent = ({ activeTask, data, numericHeaders, categoricalHeaders, allHeaders, onLoadExample, onFileSelected }: { activeTask: MLTaskType, data: DataSet, numericHeaders: string[], categoricalHeaders: string[], allHeaders: string[], onLoadExample: (e: ExampleDataSet) => void, onFileSelected: (file: File) => void }) => {
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
        case 'decision-tree-classifier':
            return <DecisionTreePage data={data} allHeaders={allHeaders} numericHeaders={numericHeaders} categoricalHeaders={categoricalHeaders} onLoadExample={onLoadExample} />;
        case 'classifier-comparison':
            return <ClassifierComparisonPage data={data} allHeaders={allHeaders} numericHeaders={numericHeaders} categoricalHeaders={categoricalHeaders} onLoadExample={onLoadExample} />;
        case 'hca':
            return <HcaPage data={data} numericHeaders={numericHeaders} onLoadExample={onLoadExample} />;
        case 'hca-comparison':
            return <HcaComparisonPage />;
        case 'discriminant-comparison':
            return <DiscriminantComparisonPage 
                        data={data} 
                        allHeaders={allHeaders} 
                        numericHeaders={numericHeaders} 
                        categoricalHeaders={categoricalHeaders} 
                        onLoadExample={onLoadExample} 
                        onFileSelected={onFileSelected} 
                    />;
        case 'pca-lda-comparison':
            return <PcaLdaComparisonPage 
                        data={data} 
                        allHeaders={allHeaders} 
                        numericHeaders={numericHeaders} 
                        categoricalHeaders={categoricalHeaders} 
                        onLoadExample={onLoadExample} 
                        onFileSelected={onFileSelected} 
                    />;
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
  const [activeTask, setActiveTask] = useState<MLTaskType>('pca-lda-comparison');
  const { toast } = useToast();
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
  const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>(['Regression Algorithms', 'Classification Algorithms', 'Unsupervised Learning']);
  
  const hasData = data.length > 0;

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
                <Collapsible open={openCategories.includes('Regression Algorithms')} onOpenChange={() => toggleCategory('Regression Algorithms')}>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start">
                            <TrendingUp className="mr-2" />
                            <span>Regression Algorithms</span>
                            <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes('Regression Algorithms') && 'rotate-180')}/>
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton onClick={() => setActiveTask('knn-regression-simple')} isActive={activeTask === 'knn-regression-simple'}>Simple KNN Regression</SidebarMenuButton>
                            </SidebarMenuItem>
                             <SidebarMenuItem>
                                <SidebarMenuButton onClick={() => setActiveTask('knn-regression-multiple')} isActive={activeTask === 'knn-regression-multiple'}>Multiple KNN Regression</SidebarMenuButton>
                            </SidebarMenuItem>
                             <SidebarMenuItem>
                                <SidebarMenuButton onClick={() => setActiveTask('ridge-regression')} isActive={activeTask === 'ridge-regression'}>Ridge Regression</SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton onClick={() => setActiveTask('lasso-regression')} isActive={activeTask === 'lasso-regression'}>Lasso Regression</SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </CollapsibleContent>
                </Collapsible>
              <Collapsible open={openCategories.includes('Classification Algorithms')} onOpenChange={() => toggleCategory('Classification Algorithms')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start">
                    <Binary className="mr-2" />
                    <span>Classification Algorithms</span>
                     <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes('Classification Algorithms') && 'rotate-180')}/>
                  </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setActiveTask('deep-learning')} isActive={activeTask === 'deep-learning'}>Deep Learning Classification</SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setActiveTask('classifier-comparison')} isActive={activeTask === 'classifier-comparison'}>Classifier Model Comparison</SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setActiveTask('decision-tree-classifier')} isActive={activeTask === 'decision-tree-classifier'}>Decision Tree Classifier</SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setActiveTask('discriminant-comparison')} isActive={activeTask === 'discriminant-comparison'}>Discriminant Analysis</SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                  </CollapsibleContent>
              </Collapsible>
              <Collapsible open={openCategories.includes('Unsupervised Learning')} onOpenChange={() => toggleCategory('Unsupervised Learning')}>
                  <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start">
                        <Users className="mr-2"/>
                        <span>Unsupervised Learning</span>
                         <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes('Unsupervised Learning') && 'rotate-180')}/>
                      </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                     <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setActiveTask('fruit-clustering')} isActive={activeTask === 'fruit-clustering'}>Fruit Image Clustering</SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton onClick={() => setActiveTask('hca')} isActive={activeTask === 'hca'}>Hierarchical Clustering</SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setActiveTask('hca-comparison')} isActive={activeTask === 'hca-comparison'}>HCA Comparison</SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setActiveTask('pca-lda-comparison')} isActive={activeTask === 'pca-lda-comparison'}>PCA vs. LDA Comparison</SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                  </CollapsibleContent>
              </Collapsible>
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
            
            {hasData && !['classifier-comparison', 'fruit-clustering', 'hca-comparison', 'discriminant-comparison', 'pca-lda-comparison'].includes(activeTask) && (
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
                onFileSelected={handleFileSelected}
             />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

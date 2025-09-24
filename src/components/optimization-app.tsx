
'use client';

import { useState, useCallback, useMemo } from 'react';
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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Target, Truck, Award, Atom, ChevronDown, FileDown } from 'lucide-react';
import LinearProgrammingPage from './pages/linear-programming-page';
import TransportationProblemPage from './pages/transportation-problem-page';
import GoalProgrammingPage from './pages/goal-programming-page';
import NonlinearProgrammingPage from './pages/nonlinear-programming-page';
import AhpPage from './pages/ahp-page';
import DeaPage from './pages/dea-page';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { cn } from '@/lib/utils';
import type { DataSet } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { parseData, unparseData } from '@/lib/stats';
import * as XLSX from 'xlsx';
import { type ExampleDataSet } from '@/lib/example-datasets';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';

type OptimizationType = 'linear-programming' | 'transportation-problem' | 'goal-programming' | 'nonlinear-programming' | 'ahp' | 'dea';

const optimizationPages: Record<string, React.ComponentType<any>> = {
  'linear-programming': LinearProgrammingPage,
  'transportation-problem': TransportationProblemPage,
  'goal-programming': GoalProgrammingPage,
  'nonlinear-programming': NonlinearProgrammingPage,
  'ahp': AhpPage,
  'dea': DeaPage,
};

export default function DecisionAnalyticsApp() {
  const [activeAnalysis, setActiveAnalysis] = useState<OptimizationType>('linear-programming');
  const [openCategories, setOpenCategories] = useState<string[]>(['Optimization', 'Quantitative Analysis']);
  
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
  const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const ActivePageComponent = optimizationPages[activeAnalysis];
  const hasData = data.length > 0;

  const processData = useCallback((content: string, name: string) => {
    setIsUploading(true);
    try {
      const { headers, data, numericHeaders, categoricalHeaders } = parseData(content);
      if (data.length === 0) throw new Error("No data found in file.");
      setData(data);
      setAllHeaders(headers);
      setNumericHeaders(numericHeaders);
      setCategoricalHeaders(categoricalHeaders);
      setFileName(name);
      toast({ title: 'Success', description: `Loaded "${name}" with ${data.length} rows.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'File Processing Error', description: error.message });
      handleClearData();
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  const handleFileSelected = useCallback((file: File) => {
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (!content) {
        toast({ variant: 'destructive', title: 'File Read Error' });
        setIsUploading(false);
        return;
      }
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const workbook = XLSX.read(content, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        processData(csv, file.name);
      } else {
        processData(content as string, file.name);
      }
    };
    reader.onerror = () => {
      toast({ variant: 'destructive', title: 'File Read Error' });
      setIsUploading(false);
    };

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        reader.readAsBinaryString(file);
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

  const handleDownloadData = () => {
     if (data.length === 0) {
      toast({ title: 'No Data to Download' });
      return;
    }
    const csv = unparseData({ headers: allHeaders, data });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.split('.')[0]}_edited.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleLoadExampleData = (example: ExampleDataSet) => {
    processData(example.data, example.name);
    if(example.recommendedAnalysis) {
      setActiveAnalysis(example.recommendedAnalysis as OptimizationType);
    }
  };

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
                <Target className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Decision Analytics</h1>
            </div>
             <div className='p-2'>
              <DataUploader onFileSelected={handleFileSelected} loading={isUploading} />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
               <Collapsible open={openCategories.includes('Optimization')} onOpenChange={() => toggleCategory('Optimization')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start text-base px-2">
                    Optimization
                    <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes('Optimization') && 'rotate-180')}/>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveAnalysis('linear-programming')}
                        isActive={activeAnalysis === 'linear-programming'}
                      >
                        Linear Programming
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveAnalysis('nonlinear-programming')}
                        isActive={activeAnalysis === 'nonlinear-programming'}
                      >
                        <Atom className="mr-2 h-4 w-4" />
                        Nonlinear Programming
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveAnalysis('transportation-problem')}
                        isActive={activeAnalysis === 'transportation-problem'}
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        Transportation Problem
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveAnalysis('goal-programming')}
                        isActive={activeAnalysis === 'goal-programming'}
                      >
                        <Award className="mr-2 h-4 w-4" />
                        Goal Programming
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                 </CollapsibleContent>
              </Collapsible>
               <Collapsible open={openCategories.includes('Quantitative Analysis')} onOpenChange={() => toggleCategory('Quantitative Analysis')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start text-base px-2">
                    Quantitative Analysis
                    <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes('Quantitative Analysis') && 'rotate-180')}/>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => setActiveAnalysis('ahp')}
                            isActive={activeAnalysis === 'ahp'}
                        >
                           AHP Analysis
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => setActiveAnalysis('dea')}
                            isActive={activeAnalysis === 'dea'}
                        >
                           Data Envelopment Analysis
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-2xl font-headline font-bold md:hidden">Decision Analytics</h1>
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
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

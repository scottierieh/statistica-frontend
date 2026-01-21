'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
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
import {
  FileText,
  Loader2,
  TrendingUp,
  Award,
  Truck,
  Target,
  Sigma,
  Repeat,
  Component,
  ArrowDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  type DataSet,
  parseData,
  unparseData,
} from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import DataUploader from '@/components/data-uploader';
import DataPreview from '@/components/data-preview';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

// Import scenario pages
import LinearProgrammingPage from '@/components/pages/optimization/linear-programming-page';
import GoalProgrammingPage from '@/components/pages/optimization/goal-programming-page';
import TransportationProblemPage from '@/components/pages/optimization/transportation-problem-page';
import IntegerProgrammingPage from '@/components/pages/optimization/integer-programming-page';
import GradientDescentPage from '@/components/pages/optimization/gradient-descent-page';
import NonLinearProgrammingPage from '@/components/pages/optimization/nonlinear-programming-page';
import DynamicProgrammingPage from '@/components/pages/optimization/dynamic-programming-page';
import ConvexOptimizationPage from '@/components/pages/optimization/convex-optimization-page';


const analysisPages: Record<string, React.ComponentType<any>> = {
  'linear-programming': LinearProgrammingPage,
  'goal-programming': GoalProgrammingPage,
  'transportation-problem': TransportationProblemPage,
  'integer-programming': IntegerProgrammingPage,
  'gradient-descent': GradientDescentPage,
  'nonlinear-programming': NonLinearProgrammingPage,
  'dynamic-programming': DynamicProgrammingPage,
  'convex-optimization': ConvexOptimizationPage,
};


export default function OptimizationApp() {
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
  const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<string>('linear-programming');

  const { toast } = useToast();

  const handleClearData = useCallback(() => {
    setData([]);
    setAllHeaders([]);
    setNumericHeaders([]);
    setCategoricalHeaders([]);
    setFileName('');
  }, []);

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
        toast({ variant: 'destructive', title: 'File Processing Error', description: error.message });
        handleClearData();
      } finally {
        setIsUploading(false);
      }
  }, [toast, handleClearData]);

  const handleFileSelected = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target?.result as string;
        processData(content, file.name);
    };
    reader.onerror = () => {
        toast({ variant: 'destructive', title: 'File Read Error', description: 'An error occurred while reading the file.' });
    };
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

  const handleLoadExampleData = (example: ExampleDataSet) => {
    processData(example.data, example.name);
    if(example.recommendedAnalysis) {
      setActiveAnalysis(example.recommendedAnalysis);
    }
  };

  const analysisItems = [
    { id: 'linear-programming', label: 'Linear Programming (LP)', icon: TrendingUp },
    { id: 'integer-programming', label: 'Integer Programming (IP)', icon: Sigma },
    { id: 'nonlinear-programming', label: 'Non-linear Programming (NLP)', icon: TrendingUp, disabled: true },
    { id: 'goal-programming', label: 'Goal Programming', icon: Award },
    { id: 'transportation-problem', label: 'Transportation Problem', icon: Truck },
    { id: 'gradient-descent', label: 'Gradient Descent', icon: ArrowDown },
    { id: 'dynamic-programming', label: 'Dynamic Programming (DP)', icon: Repeat, disabled: true },
    { id: 'convex-optimization', label: 'Convex Optimization', icon: Component, disabled: true },
  ];

  const ActivePageComponent = analysisPages[activeAnalysis] || LinearProgrammingPage;
  const hasData = data.length > 0;

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
              <DataUploader 
                onFileSelected={handleFileSelected}
                loading={isUploading}
              />
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-2 p-2">
            <SidebarMenu>
              {analysisItems.map(item => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveAnalysis(item.id)}
                    isActive={activeAnalysis === item.id}
                    disabled={item.disabled}
                  >
                    <item.icon className="h-4 w-4"/>
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger className="md:hidden"/>
                <h1 className="text-2xl font-headline font-bold md:hidden">Decision Analytics</h1>
                <div />
            </header>
            
            {hasData && (
              <DataPreview 
                fileName={fileName}
                data={data}
                headers={allHeaders}
                onDownload={() => {}}
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

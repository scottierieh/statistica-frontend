

'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu
} from '@/components/ui/sidebar';
import GradientDescentPage from "./pages/gradient-descent-page";
import CentralLimitTheoremPage from './pages/central-limit-theorem-page';
import MarketingAnalysisPage from './pages/marketing-analysis-page';
import PingouinRmAnovaPage from './pages/repeated-measures-anova-page';
import { FastForward, PlayCircle, TrendingUp, BarChart, Repeat } from 'lucide-react';
import type { ExampleDataSet } from '@/lib/example-datasets';
import { DataSet, parseData, unparseData } from '@/lib/stats';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Button } from './ui/button';


type SimulationType = 'gradient-descent' | 'central-limit-theorem' | 'marketing-analysis' | 'repeated-measures-anova';

const simulationPages: Record<string, React.ComponentType<any>> = {
  'gradient-descent': GradientDescentPage,
  'central-limit-theorem': CentralLimitTheoremPage,
  'marketing-analysis': MarketingAnalysisPage,
  'repeated-measures-anova': PingouinRmAnovaPage,
};

export default function SimulationApp() {
  const [activeSimulation, setActiveSimulation] = useState<SimulationType>('gradient-descent');
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
  const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
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
      setActiveSimulation(example.recommendedAnalysis as SimulationType);
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
      a.download = fileName.replace(/\.[^/.]+$/, "") + ".csv" || 'simulation_data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download data:', error);
      toast({ variant: 'destructive', title: 'Download Error', description: 'Could not prepare data for download.' });
    }
  };

  const ActivePageComponent = simulationPages[activeSimulation] || GradientDescentPage;
  const hasData = data.length > 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <FastForward className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Simulation</h1>
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSimulation('gradient-descent')}
                  isActive={activeSimulation === 'gradient-descent'}
                >
                  <PlayCircle />
                  <span>Gradient Descent</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSimulation('central-limit-theorem')}
                  isActive={activeSimulation === 'central-limit-theorem'}
                >
                  <TrendingUp />
                  <span>Central Limit Theorem</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSimulation('marketing-analysis')}
                  isActive={activeSimulation === 'marketing-analysis'}
                >
                  <BarChart />
                  <span>Marketing Analysis</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSimulation('repeated-measures-anova')}
                  isActive={activeSimulation === 'repeated-measures-anova'}
                >
                  <Repeat />
                  <span>Repeated Measures ANOVA</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger className="md:hidden"/>
                <h1 className="text-2xl font-headline font-bold md:hidden">Simulation</h1>
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
              onFileSelected={handleFileSelected}
              isUploading={isUploading}
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

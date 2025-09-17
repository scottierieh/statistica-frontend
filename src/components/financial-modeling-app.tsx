
'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  FileText,
  Loader2,
  Network,
  Sigma,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  type DataSet,
  parseData,
} from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';
import SnaPage from './pages/sna-page';

type AnalysisType = 'sna' | string;

const analysisPages: Record<string, React.ComponentType<any>> = {
    sna: SnaPage,
};

const analysisMenu = [
  {
    field: 'Network Analysis',
    icon: Network,
    methods: [
      { id: 'sna', label: 'Social Network Analysis' },
    ]
  },
];

export default function FinancialModelingApp() {
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType>('sna');
  
  const { toast } = useToast();
  
  const processData = useCallback((content: string, name: string) => {
    setIsUploading(true);
    try {
        const { headers: newHeaders, data: newData } = parseData(content);
        
        if (newData.length === 0 || newHeaders.length === 0) {
          throw new Error("No valid data found in the file.");
        }
        setData(newData);
        setAllHeaders(newHeaders);
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
    setFileName('');
  };
  
  const ActivePageComponent = analysisPages[activeAnalysis] || SnaPage;
  const hasData = data.length > 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <DollarSign className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Financial Modeling</h1>
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
              {analysisMenu.map((category) => (
                <SidebarMenuItem key={category.field}>
                  {category.methods.map(method => (
                    <SidebarMenuButton
                      key={method.id}
                      onClick={() => setActiveAnalysis(method.id as AnalysisType)}
                      isActive={activeAnalysis === method.id}
                    >
                      <category.icon />
                      <span>{method.label}</span>
                    </SidebarMenuButton>
                  ))}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
             <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger className="md:hidden"/>
                <h1 className="text-2xl font-headline font-bold md:hidden">Financial Modeling</h1>
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
                onLoadExample={() => {}}
               />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

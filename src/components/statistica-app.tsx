'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  SidebarGroupLabel
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  FileText,
  Loader2,
  TrendingUp,
  Landmark,
  Building,
  FastForward,
  PlayCircle,
  BarChart,
  GitBranch,
  Users,
  Waypoints,
  CalendarDays,
  Wand2,
  Sigma,
  TestTube,
  Repeat,
  HeartPulse,
  Shield,
  Component,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Network,
  Columns,
  Sun,
  Target,
  Layers,
  Map,
  Timer,
  ScanSearch,
  Package,
  Atom,
  MessagesSquare,
  Share2,
  GitCommit,
  DollarSign,
  ThumbsUp,
  ClipboardList,
  Handshake,
  Replace,
  Activity,
  Palette,
  Crosshair,
  FlaskConical,
  Feather,
  Settings2,
  Smile,
  Scaling,
  AreaChart,
  LineChart,
  Car,
  ChevronsUpDown,
  BarChart2,
  Calculator,
  Brain,
  Link2,
  ScatterChart,
  ShieldCheck,
  Scissors,
  FileSearch,
  CheckSquare,
  Clock,
  Filter,
  Download,
  Bot,
  BookOpen,
  Building,
  Award,
  Truck,
  Percent,
  Container,
  Search
} from 'lucide-react';


import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
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
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';
import { UserNav } from './user-nav';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import DescriptiveStatisticsPage from '@/components/pages/descriptive-stats-page';

// Default page to show when no data is loaded or for the overview.
const GuidePage = ({ onFileSelected, onLoadExample, isUploading }: { onFileSelected: (file: File) => void; onLoadExample: (example: ExampleDataSet) => void; isUploading: boolean; }) => {
    return (
        <Card className="flex-1">
            <CardHeader>
                <CardTitle className="font-headline">Welcome to Statistica</CardTitle>
                <CardDescription>Your intelligent statistical analysis co-pilot.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="mb-4">Get started by loading your data:</p>
                <DataUploader onFileSelected={onFileSelected} loading={isUploading} />
                <div className="my-4 text-center text-sm text-muted-foreground">or</div>
                <h4 className="font-semibold mb-2">Load an Example Dataset</h4>
                <div className="grid grid-cols-2 gap-2">
                    {exampleDatasets.slice(0, 4).map(example => (
                        <Button key={example.id} variant="outline" onClick={() => onLoadExample(example)}>
                            <example.icon className="mr-2 h-4 w-4" />
                            {example.name}
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

const analysisCategories = [
  {
    name: 'Overview',
    icon: BookOpen,
    isSingle: true,
    items: [
      { id: 'guide', label: 'Overview', icon: BookOpen, component: GuidePage },
    ]
  },
  {
    name: 'Descriptive',
    icon: BarChart,
    items: [
        { id: 'descriptive-stats', label: 'Descriptive Statistics', icon: BarChart, component: DescriptiveStatisticsPage }
    ],
  },
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
  const [activeAnalysis, setActiveAnalysis] = useState('guide');
  const [openCategories, setOpenCategories] = useState<string[]>(['Guide']);
  const [searchTerm, setSearchTerm] = useState('');
  const analysisPageRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  };

  const handleClearData = useCallback(() => {
    setData([]);
    setAllHeaders([]);
    setNumericHeaders([]);
    setCategoricalHeaders([]);
    setFileName('');
    setActiveAnalysis('guide');
  }, []);


  const processData = useCallback((content: string, name: string) => {
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
      toast({ title: 'Success', description: `Loaded "${name}" and found ${newData.length} rows.` });

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
  }, [toast, handleClearData]);

  const handleFileSelected = useCallback((file: File) => {
    setIsUploading(true);
    const reader = new FileReader();

    reader.onerror = () => {
      toast({ variant: 'destructive', title: 'File Read Error', description: 'An error occurred while reading the file.' });
      setIsUploading(false);
    };

    if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          const workbook = XLSX.read(uint8Array, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          processData(csv, file.name);
        } catch (error) {
          toast({ variant: 'destructive', title: 'Excel Parse Error', description: 'Could not parse Excel file.' });
          setIsUploading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) {
          toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read file content.' });
          setIsUploading(false);
          return;
        }
        processData(content, file.name);
      };
      reader.readAsText(file);
    }
  }, [processData, toast]);

  const handleLoadExampleData = useCallback((example: ExampleDataSet) => {
    setIsUploading(true);
    processData(example.data, example.name);
    if (example.recommendedAnalysis) {
      setActiveAnalysis(example.recommendedAnalysis);
    }
  }, [processData]);

  const handleDownloadData = useCallback(() => {
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
      a.download = fileName.replace(/\.[^/.]+$/, "") + "_statistica.csv" || 'statistica_data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download data:', error);
      toast({ variant: 'destructive', title: 'Download Error', description: 'Could not prepare data for download.' });
    }
  }, [data, allHeaders, fileName, toast]);

  const handleDownloadAsPDF = useCallback(async () => {
    if (!analysisPageRef.current) return;
    toast({ title: "Generating PDF...", description: "Please wait while the report is being captured." });

    try {
      const canvas = await html2canvas(analysisPageRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: window.getComputedStyle(document.body).backgroundColor,
        onclone: (document) => {
          // You can modify the cloned document before capture if needed
        }
      });
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `Statistica_Report_${activeAnalysis}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = image;
      link.click();
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast({ title: "Error", description: "Could not generate PDF.", variant: "destructive" });
    }
  }, [activeAnalysis, toast]);

  const handleGenerateReport = useCallback(async (analysisType: string, stats: any, viz: string | null) => {
    setIsGeneratingReport(true);
    try {
      const result = await getSummaryReport({
        analysisType,
        statistics: JSON.stringify(stats, null, 2),
        visualizations: viz || "No visualization available.",
      });
      if (result.success && result.report) {
        setReport({ title: 'Analysis Report', content: result.report });
      } else {
        toast({ variant: 'destructive', title: 'Failed to generate report', description: result.error });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'An error occurred while generating the report.' });
    } finally {
      setIsGeneratingReport(false);
    }
  }, [toast]);

  const downloadReport = useCallback(() => {
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
  }, [report]);

  const hasData = data.length > 0;

  const filteredAnalysisCategories = useMemo(() => {
    if (!searchTerm) {
      return analysisCategories;
    }
    const lowercasedFilter = searchTerm.toLowerCase();

    return analysisCategories.map(category => {
      if (category.isSingle) {
        const hasMatch = category.items[0].label.toLowerCase().includes(lowercasedFilter);
        return hasMatch ? category : null;
      }

      if (category.items) {
        const filteredItems = category.items.filter(item => item.label.toLowerCase().includes(lowercasedFilter));
        return filteredItems.length > 0 ? { ...category, items: filteredItems } : null;
      }

      return null;
    }).filter(Boolean) as typeof analysisCategories;
  }, [searchTerm]);

  const ActivePageComponent = useMemo(() => {
    for (const category of analysisCategories) {
        if (category.items) {
            const found = category.items.find(item => item.id === activeAnalysis);
            if (found) return found.component;
        }
    }
    return GuidePage; // Fallback to GuidePage
  }, [activeAnalysis]);

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
            <div className='p-2 space-y-2'>
              <DataUploader
                onFileSelected={handleFileSelected}
                loading={isUploading}
              />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search analyses..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {filteredAnalysisCategories.map(category =>
                category.isSingle ? (
                  <SidebarMenuItem key={category.name}>
                    <SidebarMenuButton
                      onClick={() => setActiveAnalysis(category.items[0].id)}
                      isActive={activeAnalysis === category.items[0].id}
                      className="text-base font-semibold"
                    >
                      <category.icon className="mr-2 h-5 w-5" />
                      {category.name}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : (
                  <Collapsible key={category.name} open={openCategories.includes(category.name)} onOpenChange={() => toggleCategory(category.name)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start text-base px-2 font-semibold bg-muted text-foreground">
                        <category.icon className="mr-2 h-5 w-5" />
                        <span>{category.name}</span>
                        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes(category.name) && 'rotate-180')} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenu>
                        {category.items.map(item => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => setActiveAnalysis(item.id)}
                              isActive={activeAnalysis === item.id}
                            >
                              {item.icon && <item.icon />}
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
          <SidebarFooter className="flex-col gap-2">
            <div className="w-full flex gap-2">
              <Button variant="outline" onClick={() => setActiveAnalysis('history')} className="flex-1">
                <Clock />
                <span className="group-data-[collapsible=icon]:hidden">History</span>
              </Button>
              <Button onClick={handleDownloadAsPDF} disabled={!hasData} className="flex-1">
                <Download />
                <span className="group-data-[collapsible=icon]:hidden">PDF</span>
              </Button>
            </div>
            <Separator />
            <UserNav />
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div ref={analysisPageRef} className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-2xl font-headline font-bold md:hidden">Statistica</h1>
              <div />
            </header>

            {hasData && activeAnalysis !== 'guide' && (
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
              activeAnalysis={activeAnalysis}
              onGenerateReport={(stats: any, viz: string | null) => handleGenerateReport(activeAnalysis, stats, viz)}
            />
          </div>
        </SidebarInset>
      </div>

      <Dialog open={!!report} onOpenChange={(open) => !open && setReport(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline">{report?.title}</DialogTitle>
            <DialogDescription>
              An AI-generated summary of your data and selected analysis.
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

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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Calculator,
  Upload,
  FileText,
  Trash2,
  Filter,
  Loader2,
} from 'lucide-react';
import {
  type DataSet,
  type DataPoint,
  parseData,
  calculateDescriptiveStats,
  calculateCorrelationMatrix,
} from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import AnalysisDashboard from './analysis-dashboard';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { getSummaryReport } from '@/app/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';

type Filter = {
  column: string;
  min: number;
  max: number;
};

export default function StatisticaApp() {
  const [data, setData] = useState<DataSet>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [report, setReport] = useState<{ title: string, content: string } | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredData = useMemo(() => {
    if (filters.length === 0) return data;
    return data.filter(row => {
      return filters.every(filter => {
        const value = row[filter.column];
        return value >= filter.min && value <= filter.max;
      });
    });
  }, [data, filters]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return {};
    return calculateDescriptiveStats(filteredData, headers);
  }, [filteredData, headers]);

  const correlationMatrix = useMemo(() => {
    if (filteredData.length === 0) return [];
    return calculateCorrelationMatrix(filteredData, headers);
  }, [filteredData, headers]);

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
        const { headers: newHeaders, data: newData } = parseData(content);
        if (newData.length === 0 || newHeaders.length === 0) {
          throw new Error("No valid numerical data found in the file.");
        }
        setData(newData);
        setHeaders(newHeaders);
        // Initialize filters
        const initialFilters = newHeaders.map(h => {
            const columnData = newData.map(row => row[h]);
            const min = Math.min(...columnData);
            const max = Math.max(...columnData);
            return { column: h, min, max, currentMin: min, currentMax: max };
        });
        setFilters(initialFilters.map(f => ({ column: f.column, min: f.currentMin, max: f.currentMax })));
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
    setHeaders([]);
    setFileName('');
    setFilters([]);
  };

  const handleGenerateReport = async () => {
    if (filteredData.length === 0) {
      toast({ title: 'No data to report', description: 'Please upload a file first.' });
      return;
    }
    setIsGeneratingReport(true);
    const statsString = JSON.stringify(stats, null, 2);
    const vizString = "Charts for " + headers.join(', ');

    const result = await getSummaryReport({ statistics: statsString, visualizations: vizString });
    if (result.success && result.report) {
      setReport({ title: 'Summary Report', content: result.report });
    } else {
      toast({ variant: 'destructive', title: 'Report Generation Failed', description: result.error });
    }
    setIsGeneratingReport(false);
  };
  
  const handleFilterChange = (column: string, newRange: number[]) => {
    setFilters(prevFilters =>
      prevFilters.map(f =>
        f.column === column ? { ...f, min: newRange[0], max: newRange[1] } : f
      )
    );
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

  const dataExtents = useMemo(() => {
    const extents: Record<string, { min: number, max: number }> = {};
    headers.forEach(h => {
        const columnData = data.map(row => row[h]);
        extents[h] = { min: Math.min(...columnData), max: Math.max(...columnData) };
    });
    return extents;
  }, [data, headers]);


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
          <SidebarContent className="flex flex-col gap-4">
            <div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.txt" className="hidden" />
              <Button onClick={triggerFileUpload} className="w-full" disabled={isUploading}>
                {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
                {isUploading ? 'Processing...' : 'Upload Data'}
              </Button>
              {fileName && <p className="mt-2 text-xs text-muted-foreground text-center truncate">File: {fileName}</p>}
            </div>
            
            {data.length > 0 && (
                <div className="flex-grow overflow-y-auto px-2 space-y-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        <h3 className="font-semibold">Data Filters</h3>
                    </div>
                    <Separator />
                    {filters.map((filter, index) => (
                        <div key={index} className="space-y-3">
                            <Label className="text-sm font-medium">{filter.column}</Label>
                             <div className='flex gap-2 items-center text-xs text-muted-foreground'>
                                <span>{filter.min.toFixed(2)}</span>
                                <Slider
                                    min={dataExtents[filter.column]?.min}
                                    max={dataExtents[filter.column]?.max}
                                    step={(dataExtents[filter.column]?.max - dataExtents[filter.column]?.min) / 100}
                                    value={[filter.min, filter.max]}
                                    onValueChange={(newRange) => handleFilterChange(filter.column, newRange)}
                                />
                                <span>{filter.max.toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>
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
              <AnalysisDashboard
                data={filteredData}
                headers={headers}
                stats={stats}
                correlationMatrix={correlationMatrix}
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

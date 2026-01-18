'use client';

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Network, UploadCloud, Wand2, Lightbulb, Copy, Loader2, Image as ImageIcon, X, ArrowLeft, Code, PictureInPicture, PlayCircle, FileText, FileUp, Settings2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { getSemFromDiagram, type GenerateSemFromDiagramInput, type GenerateSemFromDiagramOutput } from '@/app/actions';
import Link from 'next/link';
import DashboardClientLayout from "@/components/dashboard-client-layout";
import { UserNav } from "@/components/user-nav";
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
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataUploader from '@/components/data-uploader';
import DataPreview from '@/components/data-preview';
import { type DataSet, parseData } from '@/lib/stats';
import * as XLSX from 'xlsx';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';


// --- Sub-page Components ---

function ModelSpecView({ modelSpec, setModelSpec }: { modelSpec: string; setModelSpec: (spec: string) => void; }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ syntax: string; explanation: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please upload an image smaller than 4MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setFileName(file.name);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleGenerate = async () => {
    if (!image) {
      toast({ variant: 'destructive', title: 'No Image', description: 'Please upload a diagram image first.' });
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      const response = await getSemFromDiagram({ diagramDataUri: image });
      if (response.success && response.syntax) {
        setResult({ syntax: response.syntax, explanation: response.explanation! });
        setModelSpec(response.syntax);
        toast({ title: 'Success', description: 'SEM syntax generated from your diagram.' });
      } else {
        throw new Error(response.error || 'Failed to generate syntax.');
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.syntax) {
      navigator.clipboard.writeText(result.syntax);
      setIsCopied(true);
      toast({ title: 'Copied to clipboard!' });
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const clearImage = () => {
    setImage(null); setFileName(null); setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp, image/gif" />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl"><PictureInPicture className="w-6 h-6 text-primary" />Diagram-to-Model</CardTitle>
          <CardDescription>Upload a diagram of your structural equation model, and our AI will automatically generate the corresponding `lavaan` syntax.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div className="relative aspect-video w-full rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-center p-4 hover:border-primary transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <AnimatePresence>
                {image ? (
                  <motion.div key="image" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full h-full">
                    <Image src={image} alt="Uploaded SEM Diagram" layout="fill" objectFit="contain" className="rounded-md" />
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 z-10" onClick={(e) => { e.stopPropagation(); clearImage(); }}><X className="w-4 h-4" /></Button>
                  </motion.div>
                ) : (
                  <motion.div key="uploader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center text-muted-foreground">
                    <UploadCloud className="w-12 h-12 mb-2" />
                    <span className="font-semibold text-primary">Click to upload</span><span>or drag and drop your diagram</span><span className="text-xs mt-2">PNG, JPG, GIF, WEBP up to 4MB</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="space-y-4">
              <Alert><Lightbulb className="h-4 w-4" /><AlertTitle>How it Works</AlertTitle><AlertDescription><ul className="list-disc list-inside space-y-1 mt-2 text-xs"><li>Use ovals/circles for latent variables.</li><li>Use squares/rectangles for observed variables.</li><li>Use single-headed arrows for regressions.</li><li>Use double-headed arrows for covariances.</li></ul></AlertDescription></Alert>
              {fileName && <p className="text-sm text-center font-medium">File: {fileName}</p>}
              <Button onClick={handleGenerate} disabled={!image || isLoading} className="w-full" size="lg">{isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}Generate Model Syntax</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Model Syntax (lavaan)</CardTitle>
          <CardDescription>The generated model syntax will appear here. You can also edit it manually.</CardDescription>
        </CardHeader>
        <CardContent>
            <Textarea value={modelSpec} onChange={(e) => setModelSpec(e.target.value)} placeholder={`# Measurement Model\nLatent1 =~ y1 + y2 + y3\n\n# Structural Model\nLatent2 ~ Latent1`} className="font-mono text-sm h-48" />
        </CardContent>
      </Card>

      <AnimatePresence>
        {result?.explanation && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader><CardTitle>AI Explanation</CardTitle></CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground"><div dangerouslySetInnerHTML={{ __html: result.explanation.replace(/\n/g, '<br/>') }} /></CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UploadDataView({ onFileSelected, onLoadExample, onClearData, fileName, data, allHeaders, isUploading }: any) {
  const semExample = exampleDatasets.find(d => d.id === 'sem' || d.id === 'factor-analysis');
  const hasData = data.length > 0;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="font-headline flex items-center gap-2"><FileUp className="w-6 h-6 text-primary" />Upload Your Data</CardTitle><CardDescription>Upload your dataset (CSV, Excel) to be used in the SEM analysis.</CardDescription></CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4">
          <DataUploader onFileSelected={onFileSelected} loading={isUploading} />
          {semExample && <Button variant="link" onClick={() => onLoadExample(semExample)}>Load SEM Example Data</Button>}
        </CardContent>
      </Card>
      {hasData && (
        <DataPreview fileName={fileName} data={data} headers={allHeaders} onDownload={() => {}} onClearData={onClearData} />
      )}
    </div>
  );
}

function SettingsView({ estimator, setEstimator }: { estimator: string; setEstimator: (val: string) => void; }) {
  return (
    <Card>
      <CardHeader><CardTitle className="font-headline flex items-center gap-2"><Settings2 className="w-6 h-6 text-primary" />Analysis Settings</CardTitle><CardDescription>Configure the parameters for the SEM estimation.</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 max-w-xs">
          <Label>Estimator</Label>
          <Select value={estimator} onValueChange={setEstimator}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ML">Maximum Likelihood (ML)</SelectItem><SelectItem value="GLS">Generalized Least Squares</SelectItem><SelectItem value="WLS">Weighted Least Squares</SelectItem></SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">ML is recommended for normally distributed data. Use GLS or WLS for non-normal data.</p>
        </div>
      </CardContent>
    </Card>
  );
}


// --- Main Dashboard Component ---

function SemDashboard() {
  const [activeSubPage, setActiveSubPage] = useState('diagram-to-model');

  // Lifted state
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [modelSpec, setModelSpec] = useState('');
  const [estimator, setEstimator] = useState('ML');
  const { toast } = useToast();
  
  const handleClearData = useCallback(() => { setData([]); setAllHeaders([]); setFileName(''); }, []);

  const processData = useCallback((content: string, name: string) => {
    try {
      const { headers: newHeaders, data: newData } = parseData(content);
      if (newData.length === 0 || newHeaders.length === 0) throw new Error("No valid data found.");
      setData(newData); setAllHeaders(newHeaders); setFileName(name);
      toast({ title: 'Success', description: `Loaded "${name}" with ${newData.length} rows.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'File Error', description: error.message });
      handleClearData();
    } finally {
      setIsUploading(false);
    }
  }, [toast, handleClearData]);
  
  const handleFileSelected = useCallback((file: File) => {
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target?.result;
        if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
            const workbook = XLSX.read(content, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            processData(csv, file.name);
        } else {
            processData(content as string, file.name);
        }
    };
    reader.onerror = () => { toast({ variant: 'destructive', title: 'File Read Error' }); setIsUploading(false); };
    if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }, [processData, toast]);

  const handleLoadExampleData = useCallback((example: ExampleDataSet) => {
    processData(example.data, example.name);
    if (example.recommendedAnalysis) {
      setActiveSubPage(example.recommendedAnalysis);
    }
  }, [processData]);


  const menuItems = [
    { id: 'diagram-to-model', label: 'Diagram to Model', icon: PictureInPicture, disabled: false },
    { id: 'upload-data', label: 'Upload Data', icon: FileUp, disabled: false },
    { id: 'settings', label: 'Settings', icon: Settings2, disabled: false },
    { id: 'manual-spec', label: 'Manual Specification', icon: Code, disabled: true },
    { id: 'run', label: 'Run Analysis', icon: PlayCircle, disabled: true },
    { id: 'results', label: 'Results Explorer', icon: FileText, disabled: true },
  ];

  const ActiveComponent = 
    activeSubPage === 'diagram-to-model' ? <ModelSpecView modelSpec={modelSpec} setModelSpec={setModelSpec} /> :
    activeSubPage === 'upload-data' ? <UploadDataView onFileSelected={handleFileSelected} onLoadExample={handleLoadExampleData} onClearData={handleClearData} fileName={fileName} data={data} allHeaders={allHeaders} isUploading={isUploading} hasData={data.length > 0} /> :
    activeSubPage === 'settings' ? <SettingsView estimator={estimator} setEstimator={setEstimator} /> :
    <Card><CardContent className="p-6">Coming Soon</CardContent></Card>;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2 p-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary"><Network className="h-6 w-6 text-primary-foreground" /></div>
              <h1 className="text-xl font-headline font-bold">SEM</h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map(item => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton onClick={() => setActiveSubPage(item.id)} isActive={activeSubPage === item.id} disabled={item.disabled} className="justify-start">
                    <item.icon className="w-4 h-4 mr-2"/>
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <div className="p-4 md:p-6 h-screen flex flex-col gap-4">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2"><SidebarTrigger className="md:hidden" /><Button variant="outline" asChild><Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Workspace</Link></Button></div>
              <div className="flex-1 flex justify-center"><h1 className="text-xl font-headline font-bold flex items-center gap-2"><Network className="h-6 w-6 text-primary" />Structural Equation Modeling</h1></div>
              <div className="w-[210px] flex justify-end"><UserNav /></div>
            </header>
            <main className="flex-1 overflow-auto"><div className="max-w-7xl mx-auto py-4">{ActiveComponent}</div></main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}


export default function SemDashboardPage() {
  return (
    <DashboardClientLayout>
        <SemDashboard />
    </DashboardClientLayout>
  );
}

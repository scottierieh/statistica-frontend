
'use client';

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Network, UploadCloud, Wand2, Lightbulb, Copy, Loader2, Image as ImageIcon, X, ArrowLeft, Code, PictureInPicture, PlayCircle, FileText, FileUp, Settings2, CheckSquare, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { getSemFromDiagram, runSemAnalysis, type GenerateSemFromDiagramInput, type GenerateSemFromDiagramOutput } from '@/app/actions';
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
import ReactMarkdown from 'react-markdown';
import SEMResultsPage from '@/components/pages/sem-results-page';


// --- Sub-page Components ---

function ModelSpecView({ modelSpec, setModelSpec }: { modelSpec: string; setModelSpec: (spec: string) => void; }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ syntax: string; explanation: string } | null>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({ variant: 'destructive', title: 'File too large', description: 'Please upload an image smaller than 4MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => { setImage(e.target?.result as string); setFileName(file.name); setResult(null); };
      reader.readAsDataURL(file);
    }
  };
  
  const handleGenerate = async () => {
    if (!image) { toast({ variant: 'destructive', title: 'No Image', description: 'Please upload a diagram image first.' }); return; }
    setIsLoading(true); setResult(null);
    try {
      const response = await getSemFromDiagram({ diagramDataUri: image });
      if (response.success && response.syntax) {
        setResult({ syntax: response.syntax, explanation: response.explanation! });
        setModelSpec(response.syntax);
        toast({ title: 'Success', description: 'SEM syntax generated from your diagram.' });
      } else { throw new Error(response.error || 'Failed to generate syntax.'); }
    } catch (e: any) { toast({ variant: 'destructive', title: 'Analysis Error', description: e.message }); } finally { setIsLoading(false); }
  };

  const clearImage = () => { setImage(null); setFileName(null); setResult(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  return (
    <div className="space-y-6">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp, image/gif" />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 font-headline text-2xl"><PictureInPicture className="w-6 h-6 text-primary" />Diagram-to-Model</CardTitle><CardDescription>Upload a diagram of your structural equation model, and our AI will automatically generate the corresponding `lavaan` syntax.</CardDescription></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div className="relative aspect-video w-full rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-center p-4 hover:border-primary transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <AnimatePresence>
                {image ? (
                  <motion.div key="image" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full h-full"><Image src={image} alt="Uploaded SEM Diagram" layout="fill" objectFit="contain" className="rounded-md" /><Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 z-10" onClick={(e) => { e.stopPropagation(); clearImage(); }}><X className="w-4 h-4" /></Button></motion.div>
                ) : (
                  <motion.div key="uploader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center text-muted-foreground"><UploadCloud className="w-12 h-12 mb-2" /><span className="font-semibold text-primary">Click to upload</span><span>or drag and drop your diagram</span><span className="text-xs mt-2">PNG, JPG, GIF, WEBP up to 4MB</span></motion.div>
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
        <CardHeader><CardTitle>Model Syntax (lavaan)</CardTitle><CardDescription>The generated model syntax will appear here. You can also edit it manually.</CardDescription></CardHeader>
        <CardContent><Textarea value={modelSpec} onChange={(e) => setModelSpec(e.target.value)} placeholder={`# Measurement Model (latent =~ indicators)
VisualAbility =~ x1 + x2 + x3

# Structural Model (regression paths)
SpeedAbility ~ VisualAbility`} className="font-mono text-sm h-48" /></CardContent>
      </Card>

      <AnimatePresence>{result?.explanation && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><Card><CardHeader><CardTitle>AI Explanation</CardTitle></CardHeader><CardContent className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{result.explanation}</ReactMarkdown></CardContent></Card></motion.div>)}</AnimatePresence>
    </div>
  );
}

function DataSettingsView({ onFileSelected, onLoadExample, onClearData, fileName, data, allHeaders, isUploading, estimator, setEstimator }: any) {
  const semExample = exampleDatasets.find(d => d.id === 'well-being-survey');
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="font-headline flex items-center gap-2"><FileUp className="w-6 h-6 text-primary" />Upload Data</CardTitle><CardDescription>Upload your dataset (CSV, Excel) to be used in the SEM analysis.</CardDescription></CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4"><DataUploader onFileSelected={onFileSelected} loading={isUploading} />{semExample && <Button variant="link" onClick={() => onLoadExample(semExample)}>Load Example Data & Model</Button>}</CardContent>
      </Card>
      
      {data.length > 0 && (<DataPreview fileName={fileName} data={data} headers={allHeaders} onDownload={() => {}} onClearData={onClearData} />)}

      <Card>
        <CardHeader><CardTitle className="font-headline flex items-center gap-2"><Settings2 className="w-6 h-6 text-primary" />Analysis Settings</CardTitle><CardDescription>Configure the parameters for the SEM estimation.</CardDescription></CardHeader>
        <CardContent className="space-y-6"><div className="space-y-3 max-w-xs"><Label>Estimator</Label><Select value={estimator} onValueChange={setEstimator}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ML">Maximum Likelihood (ML)</SelectItem><SelectItem value="GLS">Generalized Least Squares</SelectItem><SelectItem value="WLS">Weighted Least Squares</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">ML is recommended for normally distributed data. Use GLS or WLS for non-normal data.</p></div></CardContent>
      </Card>
    </div>
  );
}

function ValidationView({ modelSpec, data, estimator, onRunAnalysis, isLoading }: any) {
  const parsedModelPreview = useMemo(() => {
    const lines = modelSpec.split('\n').filter((l: string) => l.trim() && !l.trim().startsWith('#'));
    const latentCount = lines.filter((l: string) => l.includes('=~')).length;
    const pathCount = lines.filter((l: string) => l.includes('~') && !l.includes('=~') && !l.includes('~~')).length;
    return { latentCount, pathCount, isValid: latentCount > 0 || pathCount > 0 };
  }, [modelSpec]);

  const validationChecks = useMemo(() => [
    { label: 'Model specification', passed: parsedModelPreview.isValid, message: parsedModelPreview.isValid ? `${parsedModelPreview.latentCount} latent vars, ${parsedModelPreview.pathCount} paths` : 'Enter valid model syntax' },
    { label: 'Sample size', passed: data.length >= 100, message: data.length >= 200 ? `n = ${data.length} (good)` : data.length >= 100 ? `n = ${data.length} (minimum)` : `n = ${data.length} (need 100+)` },
    { label: 'Estimator selected', passed: !!estimator, message: estimator ? `Using ${estimator}` : 'Select an estimator' },
  ], [parsedModelPreview, data.length, estimator]);

  const allChecksPassed = validationChecks.every(c => c.passed);

  return (
    <Card>
      <CardHeader><CardTitle className="font-headline flex items-center gap-2"><CheckSquare className="w-6 h-6 text-primary" />Validation & Execution</CardTitle><CardDescription>Final check before running the analysis.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <h3 className="font-semibold text-lg">Pre-flight Check</h3>
        <div className="space-y-3">{validationChecks.map((check, idx) => (<div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${check.passed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}<div><p className={`font-medium text-sm ${check.passed ? 'text-green-800' : 'text-amber-800'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-1">{check.message}</p></div></div>))}</div>
      </CardContent>
      <CardFooter><Button onClick={onRunAnalysis} disabled={isLoading || !allChecksPassed} size="lg" className="w-full">{isLoading ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing...</>) : (<><PlayCircle className="mr-2 h-5 w-5" /> Run Analysis</>)}</Button></CardFooter>
    </Card>
  );
}

// --- Main Dashboard Component ---

function SemDashboard() {
  const [activeSubPage, setActiveSubPage] = useState('diagram-to-model');
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [modelSpec, setModelSpec] = useState('');
  const [estimator, setEstimator] = useState('ML');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  
  const handleClearData = useCallback(() => { setData([]); setAllHeaders([]); setFileName(''); }, []);

  const EXAMPLE_CFA_MODEL = `# Measurement Model
anxiety =~ anxiety_1 + anxiety_2 + anxiety_3 + anxiety_4
depression =~ depress_1 + depress_2 + depress_3 + depress_4
stress =~ stress_1 + stress_2 + stress_3 + stress_4`;

  const processData = useCallback((content: string, name: string) => {
    try {
      const { headers: newHeaders, data: newData } = parseData(content);
      if (newData.length === 0 || newHeaders.length === 0) throw new Error("No valid data found.");
      setData(newData); setAllHeaders(newHeaders); setFileName(name);
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'File Error', description: error.message });
      handleClearData();
    } finally { setIsUploading(false); }
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
        } else { processData(content as string, file.name); }
    };
    reader.onerror = () => { toast({ variant: 'destructive', title: 'File Read Error' }); setIsUploading(false); };
    if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  }, [processData, toast]);

  const handleLoadExampleData = useCallback((example: ExampleDataSet) => {
      processData(example.data, example.name);
      if (example.id === 'well-being-survey') {
          setModelSpec(EXAMPLE_CFA_MODEL);
      }
      setActiveSubPage('data-settings');
      toast({ title: 'Example Loaded', description: 'Example data and model specification have been loaded.' });
  }, [processData, toast]);

  const handleAnalysis = async () => {
    setIsLoading(true); setAnalysisResult(null);
    try {
      const response = await runSemAnalysis(data, modelSpec, estimator);
      if (response.success && response.result) {
        setAnalysisResult(response.result); setActiveSubPage('results');
        toast({ title: 'Analysis Complete', description: `CFI = ${response.result.fit_indices.cfi?.toFixed(3)}` });
      } else { throw new Error(response.error || 'Failed to run analysis'); }
    } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
    finally { setIsLoading(false); }
  };

  const menuItems = [
    { id: 'diagram-to-model', label: 'Model Specification', icon: Code, disabled: false },
    { id: 'data-settings', label: 'Data & Settings', icon: FileUp, disabled: false },
    { id: 'validate', label: 'Validate & Run', icon: CheckSquare, disabled: !modelSpec || data.length === 0 },
    { id: 'results', label: 'Results', icon: FileText, disabled: !analysisResult },
  ];

  const ActiveComponent = 
    activeSubPage === 'diagram-to-model' ? <ModelSpecView modelSpec={modelSpec} setModelSpec={setModelSpec} /> :
    activeSubPage === 'data-settings' ? <DataSettingsView onFileSelected={handleFileSelected} onLoadExample={handleLoadExampleData} onClearData={handleClearData} fileName={fileName} data={data} allHeaders={allHeaders} isUploading={isUploading} estimator={estimator} setEstimator={setEstimator} /> :
    activeSubPage === 'validate' ? <ValidationView modelSpec={modelSpec} data={data} estimator={estimator} onRunAnalysis={handleAnalysis} isLoading={isLoading} /> :
    activeSubPage === 'results' && analysisResult ? <SEMResultsPage results={analysisResult} /> :
    <div>Please complete the previous steps.</div>;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader><div className="flex items-center gap-2 p-2"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary"><Network className="h-6 w-6 text-primary-foreground" /></div><h1 className="text-xl font-headline font-bold">SEM</h1></div></SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map(item => (
                <SidebarMenuItem key={item.id}><SidebarMenuButton onClick={() => setActiveSubPage(item.id)} isActive={activeSubPage === item.id} disabled={item.disabled} className="justify-start"><item.icon className="w-4 h-4 mr-2"/>{item.label}</SidebarMenuButton></SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <div className="p-4 md:p-6 h-screen flex flex-col gap-4">
            <header className="flex items-center justify-between"><div className="flex items-center gap-2"><SidebarTrigger className="md:hidden" /><Button variant="outline" asChild><Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Workspace</Link></Button></div><div className="flex-1 flex justify-center"><h1 className="text-xl font-headline font-bold flex items-center gap-2"><Network className="h-6 w-6 text-primary" />Structural Equation Modeling</h1></div><div className="w-[210px] flex justify-end"><UserNav /></div></header>
            <main className="flex-1 overflow-auto"><div className="max-w-7xl mx-auto py-4">{ActiveComponent}</div></main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default function SemDashboardPage() {
  return (<DashboardClientLayout><SemDashboard /></DashboardClientLayout>);
}

    
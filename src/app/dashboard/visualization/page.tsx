
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
    Info, 
    BarChart, 
    PieChart, 
    LineChart, 
    AreaChart, 
    ScatterChart, 
    Box, 
    GitBranch, 
    Network, 
    Map, 
    TrendingUp, 
    CheckCircle, 
    AlertTriangle, 
    Settings, 
    FileSearch, 
    Users, 
    Repeat, 
    TestTube, 
    Columns, 
    Target, 
    Component, 
    HeartPulse, 
    Feather, 
    Smile, 
    Scaling, 
    ChevronsUpDown, 
    Calculator, 
    Brain, 
    Link2, 
    ShieldCheck, 
    Zap, 
    Sparkles, 
    Star, 
    Search,
    GanttChartSquare,
    CandlestickChart,
    Pyramid,
    Orbit,
    Hexagon,
    ThumbsUp,
    Grid3x3,
    LayoutGrid,
    ArrowLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import VisualizationPage from "@/components/pages/visualization-page";
import DataUploader from '@/components/data-uploader';
import DataPreview from '@/components/data-preview';
import { type DataSet, parseData, unparseData } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import * as XLSX from 'xlsx';
import DashboardClientLayout from '@/components/dashboard-client-layout';

export default function StandaloneVisualizationPage() {
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
            if (newData.length === 0 || newHeaders.length === 0) throw new Error("No valid data found in the file.");
            setData(newData);
            setAllHeaders(newHeaders);
            setNumericHeaders(newNumericHeaders);
            setCategoricalHeaders(newCategoricalHeaders);
            setFileName(name);
            toast({ title: 'Success', description: `Loaded "${name}" with ${newData.length} rows.` });
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
            const content = e.target?.result as string;
            if (!content) {
                toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read file content.' });
                setIsUploading(false);
                return;
            }
            processData(content, file.name);
        };
        reader.onerror = () => {
            toast({ variant: 'destructive', title: 'File Read Error' });
            setIsUploading(false);
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
            };
        } else {
            reader.readAsText(file);
        }
    }, [processData, toast]);

    const handleClearData = () => {
        setData([]); setAllHeaders([]); setNumericHeaders([]); setCategoricalHeaders([]); setFileName('');
    };
    
    const handleLoadExampleData = (example: ExampleDataSet) => {
        processData(example.data, example.name);
    };

    const handleDownloadData = () => {
        if (data.length === 0) return;
        const csvContent = unparseData({ headers: allHeaders, data });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const hasData = data.length > 0;
    const vizExample = exampleDatasets.find(ex => ex.id === 'iris');

    return (
        <DashboardClientLayout>
            <div className="flex flex-col min-h-screen bg-background">
                <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-card">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/dashboard/analysis">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Analysis Hub
                            </Link>
                        </Button>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <Link href="/" className="flex items-center justify-center gap-2">
                            <Calculator className="h-6 w-6 text-primary" />
                            <h1 className="text-xl font-headline font-bold">Data Visualization</h1>
                        </Link>
                    </div>
                    <div className="w-[200px]" />
                </header>
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                     {!hasData ? (
                        <div className="flex flex-1 items-center justify-center h-full">
                          <Card className="w-full max-w-2xl text-center">
                              <CardHeader>
                                  <CardTitle className="font-headline">Create a Visualization</CardTitle>
                                  <CardDescription>
                                      To get started, upload your data or load an example dataset.
                                  </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                  <DataUploader onFileSelected={handleFileSelected} loading={isUploading} />
                                  {vizExample && (
                                      <>
                                          <div className="relative my-4">
                                              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
                                          </div>
                                          <Button variant="secondary" className="w-full" onClick={() => handleLoadExampleData(vizExample)}>
                                              <vizExample.icon className="mr-2"/>
                                              Load {vizExample.name} Dataset
                                          </Button>
                                      </>
                                  )}
                              </CardContent>
                          </Card>
                        </div>
                    ) : (
                         <div className="space-y-4">
                            <DataPreview 
                                fileName={fileName}
                                data={data}
                                headers={allHeaders}
                                onDownload={handleDownloadData}
                                onClearData={handleClearData}
                            />
                            <VisualizationPage 
                                data={data}
                                allHeaders={allHeaders}
                                numericHeaders={numericHeaders}
                                categoricalHeaders={categoricalHeaders}
                                onLoadExample={handleLoadExampleData}
                            />
                        </div>
                    )}
                </main>
            </div>
        </DashboardClientLayout>
    );
}

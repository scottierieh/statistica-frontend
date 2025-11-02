
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
    Info, 
    BarChart, 
    PieChart, 
    LineChart as LineChartIcon, 
    AreaChart, 
    ScatterChart as ScatterIcon, 
    Box, 
    GitBranch, 
    Network, 
    Map, 
    TrendingUp, 
    HelpCircle, 
    MoveRight, 
    Settings, 
    FileSearch,
    GanttChartSquare,
    Dot,
    Heater,
    LayoutGrid,
    Pyramid,
    Orbit,
    Hexagon,
    CandlestickChart,
    Calculator
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


const chartInfo = [
  { category: 'Distribution', chart: 'Histogram', variableTypes: 'One continuous variable', explanation: 'Shows frequency distribution using bins', icon: BarChartIcon },
  { category: 'Distribution', chart: 'Density Plot (KDE)', variableTypes: 'One continuous variable', explanation: 'Smooth curve showing estimated probability density', icon: AreaChart },
  { category: 'Distribution', chart: 'Box Plot', variableTypes: 'One continuous + optional categorical variable', explanation: 'Shows median, quartiles, and outliers', icon: Box },
  { category: 'Distribution', chart: 'Violin Plot', variableTypes: 'One continuous + one categorical variable', explanation: 'Combines box plot with density shape', icon: GanttChartSquare },
  { category: 'Distribution', chart: 'Ridgeline Plot', variableTypes: 'One continuous + one categorical (multiple groups)', explanation: 'Compares multiple distributions stacked vertically', icon: AreaChart },
  { category: 'Distribution', chart: 'ECDF Plot', variableTypes: 'One continuous variable', explanation: 'Shows cumulative proportion of observations', icon: LineChartIcon },
  { category: 'Distribution', chart: 'Q-Q Plot', variableTypes: 'One continuous variable (or two datasets)', explanation: 'Compares data distribution to theoretical distribution', icon: ScatterIcon },
  { category: 'Relationship', chart: 'Scatter Plot', variableTypes: 'Two continuous variables', explanation: 'Shows relationship or correlation between two variables', icon: ScatterIcon },
  { category: 'Relationship', chart: 'Regression Plot', variableTypes: 'Two continuous variables', explanation: 'Scatter plot with fitted regression line', icon: LineChartIcon },
  { category: 'Relationship', chart: 'Hexbin Plot', variableTypes: 'Two continuous variables', explanation: 'Density-based scatter alternative using hexagonal cells', icon: Hexagon },
  { category: 'Relationship', chart: 'Bubble Chart', variableTypes: 'Two continuous + one continuous (size)', explanation: 'Scatter plot with bubble size encoding a third variable', icon: Dot },
  { category: 'Relationship', chart: 'Scatter Matrix', variableTypes: 'Three or more continuous variables', explanation: 'Grid of scatter plots for multivariate relationships', icon: LayoutGrid },
  { category: 'Relationship', chart: 'Heatmap', variableTypes: 'Two categorical variables + one numeric value', explanation: 'Color-coded matrix showing intensity or magnitude', icon: Heater },
  { category: 'Relationship', chart: 'Network Graph', variableTypes: 'Nodes (categorical) + edges (numeric or categorical)', explanation: 'Shows connections or relationships between entities', icon: Network },
  { category: 'Relationship', chart: 'Dendrogram', variableTypes: 'Multiple continuous variables', explanation: 'Hierarchical clustering tree structure', icon: GitBranch },
  { category: 'Relationship', chart: 'PCA Plot', variableTypes: 'Two principal components + optional category', explanation: 'Visualizes dimensionality reduction result', icon: ScatterIcon },
  { category: 'Relationship', chart: 'Scree Plot', variableTypes: 'Component number (ordered) + numeric variance', explanation: 'Shows explained variance per principal component', icon: LineChartIcon },
  { category: 'Relationship', chart: 'Cluster Plot', variableTypes: 'Two continuous + one categorical (cluster label)', explanation: 'Visualizes grouped clusters from clustering algorithm', icon: Dot },
  { category: 'Relationship', chart: 'Line Chart', variableTypes: 'Time variable + numeric variable', explanation: 'Shows trend or change over time', icon: LineChartIcon },
  { category: 'Relationship', chart: 'Area Chart', variableTypes: 'Time variable + numeric variable', explanation: 'Filled version of line chart showing magnitude', icon: AreaChart },
  { category: 'Relationship', chart: 'Stream Graph', variableTypes: 'Time variable + numeric + category', explanation: 'Flowing layered area chart for multiple groups', icon: AreaChart },
  { category: 'Categorical', chart: 'Bar Chart', variableTypes: 'One categorical + one numeric variable', explanation: 'Compares values across categories (horizontal)', icon: BarChartIcon },
  { category: 'Categorical', chart: 'Column Chart', variableTypes: 'One categorical + one numeric variable', explanation: 'Compares values across categories (vertical)', icon: BarChartIcon },
  { category: 'Categorical', chart: 'Lollipop Chart', variableTypes: 'One categorical + one numeric variable', explanation: 'Bar chart alternative with dot and stem', icon: Dot },
  { category: 'Categorical', chart: 'Pareto Chart', variableTypes: 'One categorical + one numeric variable', explanation: 'Sorted bars + cumulative line showing contribution', icon: BarChartIcon },
  { category: 'Categorical', chart: 'Grouped Bar', variableTypes: 'Two categorical + one numeric variable', explanation: 'Compare categories within groups', icon: BarChartIcon },
  { category: 'Categorical', chart: 'Stacked Bar', variableTypes: 'Two categorical + one numeric variable', explanation: 'Shows part-to-whole contribution in a bar', icon: BarChartIcon },
  { category: 'Categorical', chart: 'Stacked Column', variableTypes: 'Two categorical + one numeric variable', explanation: 'Vertical version of stacked bar chart', icon: BarChartIcon },
  { category: 'Categorical', chart: 'Pie Chart', variableTypes: 'One categorical + one numeric variable', explanation: 'Shows proportions of a whole', icon: PieChartIcon },
  { category: 'Categorical', chart: 'Donut Chart', variableTypes: 'One categorical + one numeric variable', explanation: 'Pie chart with a hole in the center', icon: PieChartIcon },
  { category: 'Categorical', chart: 'Treemap', variableTypes: 'Hierarchical categorical + numeric variable', explanation: 'Space-filling layout showing size proportion', icon: GanttChartSquare },
  { category: 'Categorical', chart: 'Sunburst', variableTypes: 'Hierarchical categorical + numeric variable', explanation: 'Radial layout for part-whole hierarchy', icon: PieChartIcon },
  { category: 'Categorical', chart: 'Sankey Diagram', variableTypes: 'Source category + target category + numeric flow', explanation: 'Shows directional flow or transitions', icon: MoveRight },
  { category: 'Categorical', chart: 'Chord Diagram', variableTypes: 'Categorical pairs + numeric weights', explanation: 'Shows relationships between categories in a circle', icon: Orbit },
  { category: 'Categorical', chart: 'Alluvial Diagram', variableTypes: 'Categorical stages + numeric flow', explanation: 'Shows how groups change across stages', icon: GanttChartSquare },
  { category: 'Categorical', chart: 'Mosaic Plot', variableTypes: 'Two or more categorical variables', explanation: 'Tile size represents proportion by combination', icon: LayoutGrid },
  { category: 'Categorical', chart: 'Likert Scale Chart', variableTypes: 'One categorical + ordinal response levels', explanation: 'Visualizes survey response distribution', icon: BarChartIcon },
  { category: 'Categorical', chart: 'Diverging Bar Chart', variableTypes: 'One categorical + positive/negative values', explanation: 'Splits bars around a central zero point', icon: BarChartIcon },
  { category: 'Categorical', chart: 'NPS Chart', variableTypes: 'One categorical + 3 rating groups', explanation: 'Shows Net Promoter Score distribution', icon: PieChartIcon },
  { category: 'Categorical', chart: 'KPI Card', variableTypes: 'One numeric value', explanation: 'Highlights single key performance indicator', icon: TrendingUp },
  { category: 'Categorical', chart: 'Bullet Chart', variableTypes: 'One numeric actual + one numeric target', explanation: 'Shows performance vs target with ranges', icon: BarChartIcon },
  { category: 'Categorical', chart: 'Waterfall Chart', variableTypes: 'Ordered categories + numeric change', explanation: 'Shows step-by-step cumulative effect', icon: BarChartIcon },
  { category: 'Categorical', chart: 'Funnel Chart', variableTypes: 'Ordered stages + numeric measure', explanation: 'Shows drop-off across process stages', icon: Pyramid }
];

const ChartGuide = () => {
    const groupedCharts = chartInfo.reduce((acc, chart) => {
        if (!acc[chart.category]) {
            acc[chart.category] = [];
        }
        acc[chart.category].push(chart);
        return acc;
    }, {} as Record<string, typeof chartInfo>);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Chart Guide</CardTitle>
                <CardDescription>Explore different chart types to find the best one for your data.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="Distribution">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="Distribution">Distribution</TabsTrigger>
                        <TabsTrigger value="Relationship">Relationship</TabsTrigger>
                        <TabsTrigger value="Categorical">Categorical</TabsTrigger>
                    </TabsList>
                    {Object.entries(groupedCharts).map(([category, charts]) => (
                        <TabsContent key={category} value={category}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Chart</TableHead>
                                        <TableHead>Variable Types</TableHead>
                                        <TableHead>Explanation</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {charts.map(chart => (
                                        <TableRow key={chart.chart}>
                                            <TableCell className="font-semibold flex items-center gap-2">
                                                <chart.icon className="w-4 h-4 text-muted-foreground" />
                                                {chart.chart}
                                            </TableCell>
                                            <TableCell>{chart.variableTypes}</TableCell>
                                            <TableCell>{chart.explanation}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    )
}

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
                            <ChartGuide />
                        </div>
                    )}
                </main>
            </div>
        </DashboardClientLayout>
    );
}

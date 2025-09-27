

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, LineChart as LineChartIcon, ScatterChart as ScatterIcon, BarChart as BarChartIcon, PieChart as PieChartIcon, Box, GanttChart, Dot, Heater, HelpCircle, MoveRight, Settings, FileSearch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { DataSet } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { ScrollArea } from '../ui/scroll-area';


const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: ExampleDataSet) => void }) => {
    const vizExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('visuals'));

    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <BarChartIcon size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Data Visualization</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Create a variety of charts and graphs to explore and present your data effectively.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why is Data Visualization Important?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Data visualization translates complex datasets into easily digestible visual formats. It helps you identify trends, patterns, and outliers that might be missed in raw data, making it an essential tool for exploratory data analysis, communication, and storytelling.
                        </p>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {vizExamples.map((ex) => {
                            const Icon = ex.icon;
                            return (
                                <Card key={ex.id} className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => onLoadExample(ex)}>
                                    <Icon className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{ex.name}</h4>
                                        <p className="text-xs text-muted-foreground">{ex.description}</p>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Upload Data:</strong> Provide a dataset in a common format like CSV or Excel.
                                </li>
                                <li>
                                    <strong>Select Chart Type:</strong> Choose a chart from one of the categories (Distribution, Relationship, Categorical).
                                </li>
                                <li>
                                    <strong>Configure Variables:</strong> Map the columns from your data to the chart's required axes (e.g., X-Axis, Y-Axis, Group).
                                </li>
                                <li>
                                    <strong>Generate Chart:</strong> The tool will instantly create the selected visualization based on your configuration.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Chart Selection Tips</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Histogram/Density Plot:</strong> To see the distribution of a single numeric variable.
                                </li>
                                <li>
                                    <strong>Bar Chart:</strong> To compare counts of different categories.
                                </li>
                                <li>
                                    <strong>Scatter Plot:</strong> To examine the relationship between two numeric variables.
                                </li>
                                 <li>
                                    <strong>Box Plot:</strong> To compare the distribution of a numeric variable across different groups.
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};


interface VisualizationPageProps {
  data: DataSet;
  allHeaders: string[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: ExampleDataSet) => void;
}

const ChartRenderer = ({ plotData }: { plotData: string | null }) => {
    if (!plotData) return null;
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Chart</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="w-full h-full flex items-center justify-center">
                    <Image src={plotData} alt="Generated chart" width={1000} height={800} />
                </div>
            </CardContent>
        </Card>
    );
};

export default function VisualizationPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: VisualizationPageProps) {
  const {toast} = useToast();
  const [view, setView] = useState('intro');
  const [activeCategory, setActiveCategory] = useState('distribution');
  const [activeChart, setActiveChart] = useState<string | null>(null);

  // State for chart configs
  const [distColumn, setDistColumn] = useState(numericHeaders[0]);
  const [barColumn, setBarColumn] = useState(categoricalHeaders[0]);
  
  const [scatterX, setScatterX] = useState(numericHeaders[0]);
  const [scatterY, setScatterY] = useState(numericHeaders.length > 1 ? numericHeaders[1] : numericHeaders[0]);
  const [scatterTrend, setScatterTrend] = useState(false);
  const [scatterGroup, setScatterGroup] = useState<string | undefined>();

  const [bubbleX, setBubbleX] = useState(numericHeaders[0]);
  const [bubbleY, setBubbleY] = useState(numericHeaders[1]);
  const [bubbleZ, setBubbleZ] = useState(numericHeaders[2]);
  
  const [pieNameCol, setPieNameCol] = useState(categoricalHeaders[0]);
  const [pieValueCol, setPieValueCol] = useState<string | undefined>();
  
  const [groupedBarCategory1, setGroupedBarCategory1] = useState(categoricalHeaders[0]);
  const [groupedBarCategory2, setGroupedBarCategory2] = useState(categoricalHeaders[1]);
  const [groupedBarValue, setGroupedBarValue] = useState(numericHeaders[0]);

  const [heatmapVars, setHeatmapVars] = useState<string[]>(numericHeaders.slice(0, 5));

  const [analysisResult, setAnalysisResult] = useState<{plot: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canRun = useMemo(() => data.length > 0 && (numericHeaders.length > 0 || categoricalHeaders.length > 0), [data, numericHeaders, categoricalHeaders]);
  
  useEffect(() => {
    setDistColumn(numericHeaders[0]);
    setBarColumn(categoricalHeaders[0]);
    setScatterX(numericHeaders[0]);
    setScatterY(numericHeaders[1] || numericHeaders[0]);
    setPieNameCol(categoricalHeaders[0]);
    setPieValueCol(undefined);
    setAnalysisResult(null);
    setActiveChart(null);
    setView(canRun ? 'main' : 'intro');
  }, [data, numericHeaders, categoricalHeaders, canRun]);

  const handleRunAnalysis = useCallback(async (chartType: string) => {
    setActiveChart(chartType);
    let config: any = { chartType };

    try {
        switch(chartType) {
            case 'histogram':
            case 'density':
            case 'box':
            case 'violin':
                if (!distColumn) { toast({ title: "Error", description: "Please select a variable."}); return; }
                config.config = { x_col: distColumn, y_col: chartType === 'box' || chartType === 'violin' ? groupedBarCategory1 : undefined };
                break;
            case 'bar':
                if (!barColumn) { toast({ title: "Error", description: "Please select a variable."}); return; }
                config.config = { x_col: barColumn };
                break;
            case 'scatter':
                if (!scatterX || !scatterY) { toast({ title: "Error", description: "Please select X and Y variables."}); return; }
                config.config = { x_col: scatterX, y_col: scatterY, trend_line: scatterTrend, group_col: scatterGroup };
                break;
            case 'bubble':
                 if (!bubbleX || !bubbleY || !bubbleZ) { toast({ title: "Error", description: "Please select X, Y, and Size variables."}); return; }
                config.config = { x_col: bubbleX, y_col: bubbleY, size_col: bubbleZ };
                break;
            case 'pie':
            case 'donut':
                if (!pieNameCol) { toast({ title: "Error", description: "Please select a category column."}); return; }
                config.config = { name_col: pieNameCol, value_col: pieValueCol };
                break;
            case 'grouped-bar':
            case 'stacked-bar':
                if (!groupedBarCategory1 || !groupedBarCategory2 || !groupedBarValue) { toast({ title: "Error", description: "Please select two categories and one value."}); return; }
                config.config = { x_col: groupedBarCategory1, group_col: groupedBarCategory2, y_col: groupedBarValue };
                break;
            case 'heatmap':
                 if (heatmapVars.length < 2) { toast({ title: "Error", description: "Please select at least two variables for the heatmap."}); return; }
                 config.config = { variables: heatmapVars };
                 break;
            default:
                toast({ title: "Error", description: "Invalid chart type selected." });
                return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        const response = await fetch('/api/analysis/visualization', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, ...config })
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setAnalysisResult(result);
        
    } catch(e: any) {
        toast({ title: "Chart Generation Error", description: e.message, variant: 'destructive' });
        setAnalysisResult(null);
    } finally {
        setIsLoading(false);
    }

  }, [data, toast, distColumn, barColumn, scatterX, scatterY, scatterTrend, scatterGroup, bubbleX, bubbleY, bubbleZ, pieNameCol, pieValueCol, groupedBarCategory1, groupedBarCategory2, groupedBarValue, heatmapVars]);

   if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

  const chartTypes = {
      distribution: [
        { id: 'histogram', label: 'Histogram', icon: BarChartIcon, disabled: numericHeaders.length === 0 },
        { id: 'box', label: 'Box Plot', icon: Box, disabled: numericHeaders.length === 0 },
        { id: 'violin', label: 'Violin Plot', icon: GanttChart, disabled: numericHeaders.length === 0 },
        { id: 'density', label: 'Density Plot', icon: AreaChart, disabled: numericHeaders.length === 0 },
      ],
      relationship: [
        { id: 'scatter', label: 'Scatter Plot', icon: ScatterIcon, disabled: numericHeaders.length < 2 },
        { id: 'bubble', label: 'Bubble Chart', icon: Dot, disabled: numericHeaders.length < 3 },
        { id: 'heatmap', label: 'Heatmap', icon: Heater, disabled: numericHeaders.length < 2 },
      ],
      categorical: [
        { id: 'bar', label: 'Bar Chart', icon: BarChartIcon, disabled: categoricalHeaders.length === 0 },
        { id: 'grouped-bar', label: 'Grouped Bar', icon: BarChartIcon, disabled: categoricalHeaders.length < 2 || numericHeaders.length < 1 },
        { id: 'stacked-bar', label: 'Stacked Bar', icon: BarChartIcon, disabled: categoricalHeaders.length < 2 || numericHeaders.length < 1 },
        { id: 'pie', label: 'Pie Chart', icon: PieChartIcon, disabled: categoricalHeaders.length === 0 },
        { id: 'donut', label: 'Donut Chart', icon: PieChartIcon, disabled: categoricalHeaders.length === 0 },
      ]
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Visualization Builder</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
            </div>
          <CardDescription>Select a chart type and the corresponding variables to generate a visualization.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="relationship">Relationship</TabsTrigger>
              <TabsTrigger value="categorical">Categorical</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 p-4 border rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {chartTypes[activeCategory as keyof typeof chartTypes].map(chart => (
                        <Button key={chart.id} variant={activeChart === chart.id ? "secondary" : "ghost"} onClick={() => handleRunAnalysis(chart.id)} disabled={chart.disabled}>
                            <chart.icon className="mr-2 h-4 w-4"/> {chart.label}
                        </Button>
                    ))}
                </div>
                
                 <div className="mt-4 pt-4 border-t">
                    {(activeChart === 'histogram' || activeChart === 'density' || activeChart === 'box' || activeChart === 'violin') && (
                        <div><Label>Variable:</Label><Select value={distColumn} onValueChange={setDistColumn}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    )}
                     {activeChart === 'bar' && (
                        <div><Label>Variable:</Label><Select value={barColumn} onValueChange={setBarColumn}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    )}
                    {activeChart === 'scatter' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                            <div><Label>X-Axis:</Label><Select value={scatterX} onValueChange={setScatterX}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Y-Axis:</Label><Select value={scatterY} onValueChange={setScatterY}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=>h !== scatterX).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                             <div><Label>Color By (Group):</Label><Select value={scatterGroup} onValueChange={v => setScatterGroup(v === 'none' ? undefined : v)}><SelectTrigger><SelectValue placeholder="None"/></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div className="flex items-center space-x-2 pt-6"><Checkbox id="trendline" checked={scatterTrend} onCheckedChange={c => setScatterTrend(!!c)}/><Label htmlFor="trendline">Show Trend Line</Label></div>
                        </div>
                    )}
                    {activeChart === 'bubble' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><Label>X-Axis:</Label><Select value={bubbleX} onValueChange={setBubbleX}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Y-Axis:</Label><Select value={bubbleY} onValueChange={setBubbleY}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=>h !== bubbleX).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Size (Z-Axis):</Label><Select value={bubbleZ} onValueChange={setBubbleZ}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=>h !== bubbleX && h !== bubbleY).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                    )}
                    {(activeChart === 'pie' || activeChart === 'donut') && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label>Category Column:</Label><Select value={pieNameCol} onValueChange={setPieNameCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Value Column (Optional):</Label><Select value={pieValueCol} onValueChange={v => setPieValueCol(v === 'none' ? undefined : v)}><SelectTrigger><SelectValue placeholder="Count of categories"/></SelectTrigger><SelectContent><SelectItem value="none">Count of categories</SelectItem>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                    )}
                    {(activeChart === 'grouped-bar' || activeChart === 'stacked-bar') && (
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><Label>Category Axis:</Label><Select value={groupedBarCategory1} onValueChange={setGroupedBarCategory1}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Group By:</Label><Select value={groupedBarCategory2} onValueChange={setGroupedBarCategory2}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.filter(h=>h !== groupedBarCategory1).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Value Column:</Label><Select value={groupedBarValue} onValueChange={setGroupedBarValue}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                    )}
                    {activeChart === 'heatmap' && (
                        <div>
                            <Label>Variables for Heatmap:</Label>
                            <ScrollArea className="h-24 border rounded p-2">
                                {numericHeaders.map(h => (
                                    <div key={h}><Checkbox checked={heatmapVars.includes(h)} onCheckedChange={(c) => setHeatmapVars(p => c ? [...p, h] : p.filter(i => i !== h))}/> <Label>{h}</Label></div>
                                ))}
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
      
       {isLoading ? (
        <Card><CardContent className="p-6"><Skeleton className="w-full h-[400px]" /></CardContent></Card>
      ) : activeChart && analysisResult ? (
        <ChartRenderer plotData={analysisResult.plot} />
      ) : (
        <div className="text-center py-10 text-muted-foreground">Please select a chart type to visualize.</div>
      )}
    </div>
  );
}

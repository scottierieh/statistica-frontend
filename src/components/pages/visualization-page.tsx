'use client';

// ✅ updated: added useRef
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, LineChart as LineChartIcon, ScatterChart as ScatterIcon, BarChart as BarChartIcon, PieChart as PieChartIcon, Box, GanttChart, Dot, Heater, HelpCircle, MoveRight, Settings, FileSearch, Play } from 'lucide-react';
// ✅ updated: Play icon import added
import { Skeleton } from '@/components/ui/skeleton';
import type { DataSet } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { ScrollArea } from '../ui/scroll-area';

// ---------- Intro ----------
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: ExampleDataSet) => void }) => {
  const vizExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('visuals'));

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
          <CardTitle className="font-headline text-4xl font-bold">Data Visualization</CardTitle>
          <CardDescription className="text-xl pt-2 text-muted-foreground">
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
                  <Icon className="mx-auto h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">{ex.name}</h4>
                    <p className="text-xs text-muted-foreground">{ex.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary" /> Setup Guide</h3>
              <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                <li><strong>Upload Data:</strong> Provide a dataset in a common format like CSV or Excel.</li>
                <li><strong>Select Chart Type:</strong> Choose a chart from one of the categories (Distribution, Relationship, Categorical).</li>
                <li><strong>Configure Variables:</strong> Map the columns from your data to the chart's required axes (e.g., X-Axis, Y-Axis, Group).</li>
                <li><strong>Generate Chart:</strong> The tool will instantly create the selected visualization based on your configuration.</li>
              </ol>
            </div>
            <div className="space-y-6">
              <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary" /> Chart Selection Tips</h3>
              <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                <li><strong>Histogram/Density Plot:</strong> To see the distribution of a single numeric variable.</li>
                <li><strong>Bar Chart:</strong> To compare counts of different categories.</li>
                <li><strong>Scatter Plot:</strong> To examine the relationship between two numeric variables.</li>
                <li><strong>Box Plot:</strong> To compare the distribution of a numeric variable across different groups.</li>
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg" />
      </Card>
    </div>
  );
};

// ---------- Types / Props ----------
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

// ---------- Helpers ----------
// ✅ updated: remove undefined safely so JSON.stringify never fails & backend receives clean payload
function sanitize<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj ?? {}));
}

// ✅ updated: basic validation per chart
function validateSelection(chartType: string | null, s: {
  distColumn?: string;
  barColumn?: string;
  scatterX?: string;
  scatterY?: string;
  scatterGroup?: string | undefined;
  bubbleX?: string;
  bubbleY?: string;
  bubbleZ?: string;
  pieNameCol?: string;
  pieValueCol?: string | undefined;
  groupedBarCategory1?: string;
  groupedBarCategory2?: string;
  groupedBarValue?: string;
  heatmapVars?: string[];
  numericHeaders?: string[];
  categoricalHeaders?: string[];
  allHeaders?: string[];
}): string | null {
  if (!chartType) return 'Select a chart type.';
  switch (chartType) {
    case 'histogram':
    case 'ecdf':
    case 'qq':
    case 'density':
    case 'box':
    case 'violin':
    case 'ridgeline':
      if (!s.distColumn) return 'Please select a numeric variable.';
      return null;
    case 'bar':
    case 'column':
    case 'diverging_bar':
    case 'likert':
    case 'nps':
    case 'waterfall':
    case 'funnel':
    case 'kpi':
    case 'bullet':
    case 'pareto':
    case 'lollipop':
      if (!s.barColumn) return 'Please select a categorical variable.';
      return null;
    case 'scatter':
    case 'regression':
    case 'hexbin':
    case 'line':
    case 'area':
    case 'stream':
      if (!s.scatterX || !s.scatterY) return 'Please select both X and Y.';
      if (s.scatterX === s.scatterY) return 'X and Y must be different.';
      return null;
    case 'calendar_heatmap':
      if (!s.scatterX || !s.scatterY) return 'Please select both X and Y.';
      return null;
    case 'bubble':
      if (!s.bubbleX || !s.bubbleY || !s.bubbleZ) return 'Please select X, Y, and Size.';
      if (new Set([s.bubbleX, s.bubbleY, s.bubbleZ]).size < 3) return 'X, Y, and Size must be different.';
      return null;
    case 'pie':
    case 'donut':
    case 'treemap':
    case 'sunburst':
      if (!s.pieNameCol) return 'Please select a category column.';
      return null;
    case 'grouped-bar':
    case 'stacked-bar':
    case 'stacked-column':
    case 'sankey':
    case 'chord':
    case 'alluvial':
    case 'mosaic':
    case 'pca':
    case 'scree':
    case 'cluster':
    case 'dendrogram':
      if (!s.groupedBarCategory1 || !s.groupedBarCategory2 || !s.groupedBarValue) return 'Please select two categories and one numeric value.';
      if (s.groupedBarCategory1 === s.groupedBarCategory2) return 'Category and Group must be different.';
      return null;
    case 'heatmap':
    case 'scatter_matrix':
      if (!s.heatmapVars || s.heatmapVars.length < 2) return 'Please select at least two variables.';
      return null;
    case 'network':
      if (!s.allHeaders || s.allHeaders.length < 2) return 'At least two columns are required.';
      return null;
    default:
      return 'Invalid chart type.';
  }
}

export default function VisualizationPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: VisualizationPageProps) {
  const { toast } = useToast();
  const [view, setView] = useState('intro');
  const [activeCategory, setActiveCategory] = useState('distribution');
  const [activeChart, setActiveChart] = useState<string | null>(null);

  // Chart config states
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
  const [waterfallStep, setWaterfallStep] = useState(categoricalHeaders[0]);
  const [waterfallValue, setWaterfallValue] = useState(numericHeaders[0]);
  const [heatmapVars, setHeatmapVars] = useState<string[]>(numericHeaders.slice(0, 5));

  const [analysisResult, setAnalysisResult] = useState<{ plot: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canRun = useMemo(() => data.length > 0 && (numericHeaders.length > 0 || categoricalHeaders.length > 0), [data, numericHeaders, categoricalHeaders]);

  // ✅ updated: result ref for auto-scroll
  const resultRef = useRef<HTMLDivElement | null>(null);

  // ✅ updated: dirty flag — when variables changed after last run
  const [isDirty, setIsDirty] = useState(false);
  const markDirty = () => setIsDirty(true);

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
    setIsDirty(false);
  }, [data, numericHeaders, categoricalHeaders, canRun]);

  // ✅ updated: keep y != x and bubble uniqueness when selections change
  useEffect(() => {
    if (scatterY === scatterX) {
      const alt = numericHeaders.find(h => h !== scatterX);
      if (alt) setScatterY(alt);
    }
  }, [scatterX, scatterY, numericHeaders]);

  useEffect(() => {
    const nexts = [bubbleX, bubbleY, bubbleZ].filter(Boolean);
    if (new Set(nexts).size < nexts.length) {
      // try to fix duplicates by picking alternative header
      const pool = numericHeaders.filter(h => !nexts.includes(h));
      if (pool.length) {
        if (bubbleZ === bubbleY) setBubbleZ(pool[0]);
        else if (bubbleY === bubbleX) setBubbleY(pool[0]);
        else if (bubbleZ === bubbleX) setBubbleZ(pool[0]);
      }
    }
  }, [bubbleX, bubbleY, bubbleZ, numericHeaders]);

  // ---------- Run ----------
  const handleRunAnalysis = useCallback(async (chartType: string) => {
    setActiveChart(chartType);
    let config: any = { chartType };

    // Build config + validations
    const validationError = validateSelection(chartType, {
      distColumn, barColumn,
      scatterX, scatterY, scatterGroup,
      bubbleX, bubbleY, bubbleZ,
      pieNameCol, pieValueCol,
      groupedBarCategory1, groupedBarCategory2, groupedBarValue,
      heatmapVars,
      numericHeaders, categoricalHeaders, allHeaders
    });

    if (validationError) {
      toast({ title: "Validation", description: validationError, variant: 'destructive' });
      return;
    }

    try {
      switch (chartType) {
        case 'histogram':
        case 'ecdf':
        case 'qq':
        case 'density':
        case 'box':
        case 'violin':
        case 'ridgeline':
          config.config = { x_col: distColumn, y_col: ['box', 'violin', 'ridgeline'].includes(chartType) ? groupedBarCategory1 : undefined };
          break;
        case 'bar':
        case 'column':
        case 'diverging_bar':
        case 'likert':
        case 'nps':
        case 'waterfall':
        case 'funnel':
        case 'kpi':
        case 'bullet':
        case 'pareto':
        case 'lollipop':
          config.config = { x_col: barColumn };
          break;
        case 'scatter':
        case 'regression':
        case 'hexbin':
          config.config = { x_col: scatterX, y_col: scatterY, trend_line: chartType === 'regression' ? true : scatterTrend, group_col: scatterGroup };
          break;
        case 'line':
        case 'area':
        case 'stream':
        case 'calendar_heatmap':
          config.config = { x_col: scatterX, y_col: scatterY };
          break;
        case 'bubble':
          config.config = { x_col: bubbleX, y_col: bubbleY, size_col: bubbleZ };
          break;
        case 'pie':
        case 'donut':
        case 'treemap':
        case 'sunburst':
          // ✅ updated: when value_col is undefined, backend can count categories
          config.config = { name_col: pieNameCol, value_col: pieValueCol }; // undefined is intentionally allowed and sanitized
          break;
        case 'grouped-bar':
        case 'stacked-bar':
        case 'stacked-column':
        case 'sankey':
        case 'chord':
        case 'alluvial':
        case 'mosaic':
        case 'pca':
        case 'scree':
        case 'cluster':
        case 'dendrogram':
          config.config = { x_col: groupedBarCategory1, group_col: groupedBarCategory2, y_col: groupedBarValue };
          break;
        case 'heatmap':
        case 'scatter_matrix':
          config.config = { variables: heatmapVars };
          break;
        case 'network':
          config.config = { x_col: allHeaders[0], y_col: allHeaders[1] };
          break;
        default:
          toast({ title: "Error", description: "Invalid chart type selected.", variant: 'destructive' });
          return;
      }

      // ✅ updated: sanitize payload to prevent undefined/JSON errors
      const payload = sanitize({ data, ...config });

      setIsLoading(true);
      setAnalysisResult(null);

      const response = await fetch('/api/analysis/visualization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Backend might not exist — we keep error as-is but show friendly toast
      if (!response.ok) {
        let errMsg = `Request failed with status ${response.status}`;
        try {
          const errorResult = await response.json();
          if (errorResult?.error) errMsg = errorResult.error;
        } catch { /* noop */ }
        throw new Error(errMsg);
      }

      // ✅ updated: defensive parsing & shape checking
      let result: any;
      try {
        result = await response.json();
      } catch {
        throw new Error('Invalid JSON response from server.');
      }

      if (!result || typeof result.plot !== 'string') {
        throw new Error('Chart image not returned. (result.plot missing)');
      }

      setAnalysisResult(result);
      setIsDirty(false);

      // ✅ updated: auto-scroll to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 30);

    } catch (e: any) {
      toast({
        title: "Chart Generation Error",
        description: e?.message ?? 'Unknown error occurred.',
        variant: 'destructive'
      });
      setAnalysisResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    data, toast,
    distColumn, barColumn,
    scatterX, scatterY, scatterTrend, scatterGroup,
    bubbleX, bubbleY, bubbleZ,
    pieNameCol, pieValueCol,
    groupedBarCategory1, groupedBarCategory2, groupedBarValue,
    heatmapVars, allHeaders
  ]);

  if (!canRun && view === 'main') {
    return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
  }
  if (view === 'intro') {
    return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
  }

  const chartTypes: Record<string, { id: string, label: string, icon: any, disabled?: boolean, tags?: string[] }[]> = {
    distribution: [
      { id: 'histogram', label: 'Histogram', icon: BarChartIcon, disabled: numericHeaders.length === 0 },
      { id: 'density', label: 'Density Plot', icon: AreaChart, disabled: numericHeaders.length === 0 },
      { id: 'box', label: 'Box Plot', icon: Box, disabled: numericHeaders.length === 0 },
      { id: 'violin', label: 'Violin Plot', icon: GanttChart, disabled: numericHeaders.length === 0 },
      { id: 'ridgeline', label: 'Ridgeline Plot', icon: AreaChart, disabled: numericHeaders.length < 1 || categoricalHeaders.length < 1 },
      { id: 'ecdf', label: 'ECDF Plot', icon: LineChartIcon, disabled: numericHeaders.length === 0 },
      { id: 'qq', label: 'Q-Q Plot', icon: ScatterIcon, disabled: numericHeaders.length === 0 },
    ],
    relationship: [
      { id: 'scatter', label: 'Scatter Plot', icon: ScatterIcon, disabled: numericHeaders.length < 2 },
      { id: 'regression', label: 'Regression Plot', icon: LineChartIcon, disabled: numericHeaders.length < 2 },
      { id: 'hexbin', label: 'Hexbin Plot', icon: ScatterIcon, disabled: numericHeaders.length < 2 },
      { id: 'bubble', label: 'Bubble Chart', icon: Dot, disabled: numericHeaders.length < 3 },
      { id: 'scatter_matrix', label: 'Scatter Matrix', icon: ScatterIcon, disabled: numericHeaders.length < 2 },
      { id: 'heatmap', label: 'Heatmap', icon: Heater, disabled: numericHeaders.length < 2 },
      { id: 'network', label: 'Network Graph', icon: Dot, disabled: allHeaders.length < 2 },
      { id: 'dendrogram', label: 'Dendrogram', icon: GanttChart, disabled: numericHeaders.length < 2 },
      { id: 'pca', label: 'PCA Plot', icon: ScatterIcon, disabled: numericHeaders.length < 2 },
      { id: 'scree', label: 'Scree Plot', icon: LineChartIcon, disabled: numericHeaders.length < 2 },
      { id: 'cluster', label: 'Cluster Plot', icon: Dot, disabled: numericHeaders.length < 2 },
      { id: 'line', label: 'Line Chart', icon: LineChartIcon, disabled: numericHeaders.length < 2 },
      { id: 'area', label: 'Area Chart', icon: AreaChart, disabled: numericHeaders.length < 2 },
      { id: 'stream', label: 'Stream Graph', icon: AreaChart, disabled: numericHeaders.length < 2 },
      { id: 'calendar_heatmap', label: 'Calendar Heatmap', icon: Heater, disabled: allHeaders.length < 2 },
    ],
    categorical: [
      { id: 'bar', label: 'Bar Chart', icon: BarChartIcon, disabled: categoricalHeaders.length === 0 },
      { id: 'column', label: 'Column Chart', icon: BarChartIcon, disabled: categoricalHeaders.length === 0 },
      { id: 'lollipop', label: 'Lollipop Chart', icon: Dot, disabled: categoricalHeaders.length === 0 },
      { id: 'pareto', label: 'Pareto Chart', icon: BarChartIcon, tags: ["Quality Control", "80/20 Rule"] },
      { id: 'grouped-bar', label: 'Grouped Bar', icon: BarChartIcon, disabled: categoricalHeaders.length < 2 || numericHeaders.length < 1 },
      { id: 'stacked-bar', label: 'Stacked Bar', icon: BarChartIcon, disabled: categoricalHeaders.length < 2 || numericHeaders.length < 1 },
      { id: 'stacked-column', label: 'Stacked Column', icon: BarChartIcon, disabled: categoricalHeaders.length < 2 || numericHeaders.length < 1 },
      { id: 'pie', label: 'Pie Chart', icon: BarChartIcon, disabled: categoricalHeaders.length === 0 },
      { id: 'donut', label: 'Donut Chart', icon: PieChartIcon, disabled: categoricalHeaders.length === 0 },
      { id: 'treemap', label: 'Treemap', icon: GanttChart, disabled: categoricalHeaders.length === 0 },
      { id: 'sunburst', label: 'Sunburst', icon: PieChartIcon, disabled: categoricalHeaders.length === 0 },
      { id: 'sankey', label: 'Sankey Diagram', icon: MoveRight, disabled: categoricalHeaders.length < 2 },
      { id: 'chord', label: 'Chord Diagram', icon: Dot, disabled: categoricalHeaders.length < 2 },
      { id: 'alluvial', label: 'Alluvial Diagram', icon: GanttChart, disabled: categoricalHeaders.length < 2 },
      { id: 'mosaic', label: 'Mosaic Plot', icon: GanttChart, disabled: categoricalHeaders.length < 2 },
      { id: 'likert', label: 'Likert Scale Chart', icon: BarChartIcon, disabled: categoricalHeaders.length < 1 },
      { id: 'diverging_bar', label: 'Diverging Bar', icon: BarChartIcon, disabled: categoricalHeaders.length < 1 },
      { id: 'nps', label: 'NPS Chart', icon: PieChartIcon, disabled: categoricalHeaders.length < 1 },
      { id: 'kpi', label: 'KPI Card', icon: Settings, disabled: numericHeaders.length === 0 },
      { id: 'bullet', label: 'Bullet Chart', icon: BarChartIcon, disabled: numericHeaders.length < 2 },
      { id: 'waterfall', label: 'Waterfall', icon: BarChartIcon, disabled: numericHeaders.length === 0 },
      { id: 'funnel', label: 'Funnel Chart', icon: GanttChart, disabled: numericHeaders.length === 0 },
    ]
  };

  // Any variable change should mark dirty
  const markDirtyWrapper = <T extends (...args: any[]) => any>(setter: T) => (...args: Parameters<T>) => {
    markDirty();
    // @ts-ignore
    return setter(...args);
  };

  const setDistColumnDirty = markDirtyWrapper(setDistColumn);
  const setBarColumnDirty = markDirtyWrapper(setBarColumn);
  const setScatterXDirty = markDirtyWrapper(setScatterX);
  const setScatterYDirty = markDirtyWrapper(setScatterY);
  const setScatterTrendDirty = markDirtyWrapper(setScatterTrend);
  const setScatterGroupDirty = markDirtyWrapper(setScatterGroup);
  const setBubbleXDirty = markDirtyWrapper(setBubbleX);
  const setBubbleYDirty = markDirtyWrapper(setBubbleY);
  const setBubbleZDirty = markDirtyWrapper(setBubbleZ);
  const setPieNameColDirty = markDirtyWrapper(setPieNameCol);
  const setPieValueColDirty = markDirtyWrapper(setPieValueCol);
  const setGroupedBarCategory1Dirty = markDirtyWrapper(setGroupedBarCategory1);
  const setGroupedBarCategory2Dirty = markDirtyWrapper(setGroupedBarCategory2);
  const setGroupedBarValueDirty = markDirtyWrapper(setGroupedBarValue);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Visualization Builder</CardTitle>
              <CardDescription>Select a chart type and configure variables to generate a visualization.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
              <HelpCircle className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="relationship">Relationship</TabsTrigger>
              <TabsTrigger value="categorical">Categorical</TabsTrigger>
            </TabsList>

            <div className="mt-4 p-4 border rounded-lg">
              {/* Chart Type Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {chartTypes[activeCategory as keyof typeof chartTypes]?.map(chart => (
                  <Button
                    key={chart.id}
                    variant={activeChart === chart.id ? "secondary" : "ghost"}
                    onClick={() => {
                      setActiveChart(chart.id);
                      // keep previous selection; do not auto-run.
                    }}
                    disabled={chart.disabled}
                    className="justify-start"
                  >
                    <chart.icon className="mr-2 h-4 w-4" /> {chart.label}
                  </Button>
                ))}
              </div>

              {/* Variables & Run Button Header */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold">
                    Variable Configuration
                    {activeChart ? <span className="ml-2 text-xs text-muted-foreground">({activeChart})</span> : null}
                  </Label>

                  {/* ✅ updated: Run button on the right-top of the variable panel */}
                  <Button
                    onClick={() => activeChart && handleRunAnalysis(activeChart)}
                    disabled={!activeChart || !canRun || isLoading}
                    variant={isDirty ? "default" : "secondary"}
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Play className="w-4 h-4 animate-pulse" /> Running...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Play className="w-4 h-4" /> Run Analysis
                      </span>
                    )}
                  </Button>
                </div>

                {/* Variable controls */}
                {(['histogram', 'density', 'ecdf',  'qq'].includes(activeChart || '')) && (
                  <div>
                    <Label>Variable</Label>
                    <Select value={distColumn} onValueChange={setDistColumnDirty}>
                      <SelectTrigger><SelectValue placeholder="Select a numeric column" /></SelectTrigger>
                      <SelectContent>
                        {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(['box', 'violin'].includes(activeChart || '')) && (
  <div className="space-y-3">
    <div>
      <Label>Numeric Variable</Label>
      <Select value={distColumn} onValueChange={setDistColumnDirty}>
        <SelectTrigger><SelectValue placeholder="Select numeric column" /></SelectTrigger>
        <SelectContent>
          {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label>Group By (optional)</Label>
      <Select value={groupedBarCategory1 ?? 'none'} onValueChange={(v) => setGroupedBarCategory1Dirty(v === 'none' ? undefined : v)}>
        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  </div>
)}
{activeChart === 'waterfall' && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>Step Column:</Label>
      <Select value={waterfallStep} onValueChange={setWaterfallStep}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent>
          {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label>Value Column:</Label>
      <Select value={waterfallValue} onValueChange={setWaterfallValue}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent>
          {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  </div>
)}
{activeChart === 'ridgeline' && (
  <div className="space-y-3">
    <div>
      <Label>Numeric Variable</Label>
      <Select value={distColumn} onValueChange={setDistColumnDirty}>
        <SelectTrigger><SelectValue placeholder="Select numeric column" /></SelectTrigger>
        <SelectContent>
          {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label>Group By (required)</Label>
      <Select value={groupedBarCategory1} onValueChange={setGroupedBarCategory1Dirty}>
        <SelectTrigger><SelectValue placeholder="Select category column" /></SelectTrigger>
        <SelectContent>
          {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  </div>
)}



                {(['bar', 'pareto', 'lollipop', 'column', 'diverging_bar', 'likert', 'nps', 'waterfall', 'funnel', 'kpi', 'bullet'].includes(activeChart || '')) && (
                  <div>
                    <Label>Variable</Label>
                    <Select value={barColumn} onValueChange={setBarColumnDirty}>
                      <SelectTrigger><SelectValue placeholder="Select a categorical column" /></SelectTrigger>
                      <SelectContent>
                        {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(['scatter', 'regression', 'hexbin'].includes(activeChart || '')) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                    <div>
                      <Label>X-Axis</Label>
                      <Select value={scatterX} onValueChange={setScatterXDirty}>
                        <SelectTrigger><SelectValue placeholder="Select X" /></SelectTrigger>
                        <SelectContent>
                          {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Y-Axis</Label>
                      <Select value={scatterY} onValueChange={setScatterYDirty}>
                        <SelectTrigger><SelectValue placeholder="Select Y" /></SelectTrigger>
                        <SelectContent>
                          {numericHeaders.filter(h => h !== scatterX).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Color By (Group)</Label>
                      <Select value={scatterGroup} onValueChange={v => setScatterGroupDirty(v === 'none' ? undefined : v)}>
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {(activeChart === 'regression' || activeChart === 'scatter') && (
                      <div className="flex items-center space-x-2 pt-6">
                        <Checkbox id="trendline" checked={scatterTrend} onCheckedChange={c => setScatterTrendDirty(!!c)} />
                        <Label htmlFor="trendline">{activeChart === 'regression' ? 'Show Regression Line' : 'Show Trend Line'}</Label>
                      </div>
                    )}
                  </div>
                )}

                {(['line', 'area', 'stream', 'calendar_heatmap'].includes(activeChart || '')) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                    <div>
                      <Label>X-Axis</Label>
                      <Select value={scatterX} onValueChange={setScatterXDirty}>
                        <SelectTrigger><SelectValue placeholder="Select X" /></SelectTrigger>
                        <SelectContent>
                          {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Y-Axis</Label>
                      <Select value={scatterY} onValueChange={setScatterYDirty}>
                        <SelectTrigger><SelectValue placeholder="Select Y" /></SelectTrigger>
                        <SelectContent>
                          {numericHeaders.filter(h => h !== scatterX).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {activeChart === 'bubble' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>X-Axis</Label>
                      <Select value={bubbleX} onValueChange={setBubbleXDirty}>
                        <SelectTrigger><SelectValue placeholder="Select X" /></SelectTrigger>
                        <SelectContent>
                          {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Y-Axis</Label>
                      <Select value={bubbleY} onValueChange={setBubbleYDirty}>
                        <SelectTrigger><SelectValue placeholder="Select Y" /></SelectTrigger>
                        <SelectContent>
                          {numericHeaders.filter(h => h !== bubbleX).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Size (Z-Axis)</Label>
                      <Select value={bubbleZ} onValueChange={setBubbleZDirty}>
                        <SelectTrigger><SelectValue placeholder="Select Size" /></SelectTrigger>
                        <SelectContent>
                          {numericHeaders.filter(h => h !== bubbleX && h !== bubbleY).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {(['pie', 'donut', 'treemap', 'sunburst'].includes(activeChart || '')) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Category Column</Label>
                      <Select value={pieNameCol} onValueChange={setPieNameColDirty}>
                        <SelectTrigger><SelectValue placeholder="Select a category column" /></SelectTrigger>
                        <SelectContent>
                          {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Value Column (Optional)</Label>
                      <Select value={pieValueCol} onValueChange={v => setPieValueColDirty(v === 'none' ? undefined : v)}>
                        <SelectTrigger><SelectValue placeholder="Count of categories" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Count of categories</SelectItem>
                          {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {(['grouped-bar', 'stacked-bar', 'stacked-column', 'sankey', 'chord', 'alluvial', 'mosaic', 'pca', 'scree', 'cluster', 'dendrogram'].includes(activeChart || '')) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Category Axis</Label>
                      <Select value={groupedBarCategory1} onValueChange={setGroupedBarCategory1Dirty}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Group By</Label>
                      <Select value={groupedBarCategory2} onValueChange={setGroupedBarCategory2Dirty}>
                        <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                        <SelectContent>
                          {categoricalHeaders.filter(h => h !== groupedBarCategory1).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Value Column</Label>
                      <Select value={groupedBarValue} onValueChange={setGroupedBarValueDirty}>
                        <SelectTrigger><SelectValue placeholder="Select value" /></SelectTrigger>
                        <SelectContent>
                          {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {(activeChart === 'heatmap' || activeChart === 'scatter_matrix' || activeChart === 'calendar_heatmap') && (
                  <div>
                    <Label>Variables for {activeChart === 'scatter_matrix' ? 'Scatter Matrix' : activeChart === 'calendar_heatmap' ? 'Calendar Heatmap' : 'Heatmap'}</Label>
                    <ScrollArea className="h-24 border rounded p-2">
                      {numericHeaders.map(h => {
                        const checked = heatmapVars.includes(h);
                        return (
                          <div key={h} className="flex items-center gap-2 py-1">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) => {
                                setIsDirty(true);
                                if (c && !checked) {
                                  setHeatmapVars(prev => [...prev, h]);
                                } else if (!c && checked) {
                                  setHeatmapVars(prev => prev.filter(i => i !== h));
                                }
                              }}

                              
                            />
                            <Label>{h}</Label>
                          </div>
                        );
                      })}
                    </ScrollArea>
                    {/* hint */}
                    <p className="text-xs text-muted-foreground mt-1">Select at least two variables.</p>
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
        <div ref={resultRef}>
          <ChartRenderer plotData={analysisResult.plot} />
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground">Select a chart type, configure variables, then click <strong>Run Analysis</strong>.</div>
      )}
    </div>
  );
}


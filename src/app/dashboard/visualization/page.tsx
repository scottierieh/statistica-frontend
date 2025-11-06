'use client';

// ✅ updated: added useRef
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, LineChart as LineChartIcon, ScatterChart as ScatterIcon, BarChart as BarChartIcon, PieChart as PieChartIcon, Box, GanttSquare, Dot, Heater, HelpCircle, MoveRight, Settings, FileSearch, Play, ArrowLeft } from 'lucide-react';
// ✅ updated: Play icon import added
import { Skeleton } from '@/components/ui/skeleton';
import type { DataSet } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

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
        <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
            <Button variant="outline" asChild>
                <Link href="/dashboard/analysis">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Analysis Hub
                </Link>
            </Button>
            <Button size="lg" onClick={onStart}>Get Started <MoveRight className="ml-2 w-5 h-5"/></Button>
        </CardFooter>
      </Card>
    </div>
  );
};


const chartInfo = [
  { category: 'Distribution', chart: 'Histogram', variableTypes: 'One continuous variable', explanation: 'Shows frequency distribution using bins', icon: BarChartIcon },
  { category: 'Distribution', chart: 'Density Plot (KDE)', variableTypes: 'One continuous variable', explanation: 'Smooth curve showing estimated probability density', icon: AreaChart },
  { category: 'Distribution', chart: 'Box Plot', variableTypes: 'One continuous + optional categorical variable', explanation: 'Shows median, quartiles, and outliers', icon: Box },
  { category: 'Distribution', chart: 'Violin Plot', variableTypes: 'One continuous + one categorical variable', explanation: 'Combines box plot with density shape', icon: GanttSquare },
  { category: 'Distribution', chart: 'Ridgeline Plot', variableTypes: 'One continuous + one categorical (multiple groups)', explanation: 'Compares multiple distributions stacked vertically', icon: AreaChart },
  { category: 'Distribution', chart: 'ECDF Plot', variableTypes: 'One continuous variable', explanation: 'Shows cumulative proportion of observations', icon: LineChartIcon },
  { category: 'Distribution', chart: 'Q-Q Plot', variableTypes: 'One continuous variable (or two datasets)', explanation: 'Compares data distribution to theoretical distribution', icon: ScatterIcon },
  { category: 'Relationship', chart: 'Scatter Plot', variableTypes: 'Two continuous variables', explanation: 'Shows relationship or correlation between two variables', icon: ScatterIcon },
  { category: 'Relationship', chart: 'Regression Plot', variableTypes: 'Two continuous variables', explanation: 'Scatter plot with fitted regression line', icon: LineChartIcon },
  { category: 'Relationship', chart: 'Hexbin Plot', variableTypes: 'Two continuous variables', explanation: 'Density-based scatter alternative using hexagonal cells', icon: ScatterIcon },
  { category: 'Relationship', chart: 'Bubble Chart', variableTypes: 'Two continuous + one continuous (size)', explanation: 'Scatter plot with bubble size encoding a third variable', icon: Dot },
  { category: 'Relationship', chart: 'Scatter Matrix', variableTypes: 'Three or more continuous variables', explanation: 'Grid of scatter plots for multivariate relationships', icon: ScatterIcon },
  { category: 'Relationship', chart: 'Heatmap', variableTypes: 'Two categorical variables + one numeric value', explanation: 'Color-coded matrix showing intensity or magnitude', icon: Heater },
  { category: 'Relationship', chart: 'Network Graph', variableTypes: 'Nodes (categorical) + edges (numeric or categorical)', explanation: 'Shows connections or relationships between entities', icon: Dot },
  { category: 'Relationship', chart: 'Dendrogram', variableTypes: 'Multiple continuous variables', explanation: 'Hierarchical clustering tree structure', icon: GanttSquare },
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
  { category: 'Categorical', chart: 'Treemap', variableTypes: 'Hierarchical categorical + numeric variable', explanation: 'Space-filling layout showing size proportion', icon: GanttSquare },
  { category: 'Categorical', chart: 'Sunburst', variableTypes: 'Hierarchical categorical + numeric variable', explanation: 'Radial layout for part-whole hierarchy', icon: PieChartIcon },
  { category: 'Categorical', chart: 'Sankey Diagram', variableTypes: 'Source category + target category + numeric flow', explanation: 'Shows directional flow or transitions', icon: MoveRight },
  { category: 'Categorical', chart: 'Chord Diagram', variableTypes: 'Categorical pairs + numeric weights', explanation: 'Shows relationships between categories in a circle', icon: Dot },
  { category: 'Categorical', chart: 'Alluvial Diagram', variableTypes: 'Categorical stages + numeric flow', explanation: 'Shows how groups change across stages', icon: GanttSquare },
  { category: 'Categorical', chart: 'Mosaic Plot', variableTypes: 'Two or more categorical variables', explanation: 'Tile size represents proportion by combination', icon: GanttSquare },
  { category: 'Categorical', chart: 'Likert Scale Chart', variableTypes: 'One categorical + ordinal response levels', explanation: 'Visualizes survey response distribution', icon: BarChartIcon },
  { category: 'Categorical', chart: 'Diverging Bar Chart', variableTypes: 'One categorical + positive/negative values', explanation: 'Splits bars around a central zero point', icon: BarChartIcon },
  { category: 'Categorical', chart: 'NPS Chart', variableTypes: 'One categorical + 3 rating groups', explanation: 'Shows Net Promoter Score distribution', icon: PieChartIcon },
  { category: 'Categorical', chart: 'KPI Card', variableTypes: 'One numeric value', explanation: 'Highlights single key performance indicator', icon: Settings },
  { category: 'Categorical', chart: 'Bullet Chart', variableTypes: 'One numeric actual + one numeric target', explanation: 'Shows performance vs target with ranges', icon: BarChartIcon },
  { category: 'Categorical', chart: 'Waterfall Chart', variableTypes: 'Ordered categories + numeric change', explanation: 'Shows step-by-step cumulative effect', icon: BarChartIcon },
  { category: 'Categorical', chart: 'Funnel Chart', variableTypes: 'Ordered stages + numeric measure', explanation: 'Shows drop-off across process stages', icon: GanttSquare },
];


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
  networkSource?: string;
  networkTarget?: string;
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
      if (!s.networkSource || !s.networkTarget) return 'Please select a Source and Target column.';
      if (s.networkSource === s.networkTarget) return 'Source and Target must be different.';
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
  const [networkSource, setNetworkSource] = useState(allHeaders[0]);
  const [networkTarget, setNetworkTarget] = useState(allHeaders[1]);

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
      heatmapVars, networkSource, networkTarget,
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
          config.config = { source_col: networkSource, target_col: networkTarget };
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
    heatmapVars, networkSource, networkTarget, allHeaders
  ]);

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
  const setNetworkSourceDirty = markDirtyWrapper(setNetworkSource);
  const setNetworkTargetDirty = markDirtyWrapper(setNetworkTarget);


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
                  <div className="grid grid-cols-2 gap-4">
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
                {activeChart === 'ridgeline' && (
                  <div className="grid grid-cols-2 gap-4">
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

                {(['bar', 'column', 'pareto', 'lollipop', 'diverging_bar', 'likert', 'nps', 'waterfall', 'funnel', 'kpi', 'bullet'].includes(activeChart || '')) && (
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
                          {allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
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

                {(['grouped-bar', 'stacked-bar', 'stacked-column'].includes(activeChart || '')) && (
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

                {activeChart === 'heatmap' && (
                  <div>
                    <Label>Variables for Heatmap</Label>
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

                {activeChart === 'network' && (
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Source Column</Label>
                        <Select value={networkSource} onValueChange={setNetworkSourceDirty}>
                          <SelectTrigger><SelectValue placeholder="Select Source" /></SelectTrigger>
                          <SelectContent>
                            {allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                       <div>
                        <Label>Target Column</Label>
                        <Select value={networkTarget} onValueChange={setNetworkTargetDirty}>
                          <SelectTrigger><SelectValue placeholder="Select Target" /></SelectTrigger>
                          <SelectContent>
                            {allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                  </div>
                )}
                
                 {(['sankey', 'chord', 'alluvial', 'mosaic', 'pca', 'scree', 'cluster', 'dendrogram'].includes(activeChart || '')) && (
                  <p className="text-sm text-muted-foreground text-center py-4">This chart type uses the three-column selection above (Category, Group, Value).</p>
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

      {/* Guide Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Guide</CardTitle>
          <CardDescription>A reference for which chart to use based on your analysis goal.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Chart Type</TableHead>
                <TableHead>Variable Types</TableHead>
                <TableHead>Explanation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartInfo.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.category}</TableCell>
                  <TableCell className="font-semibold">{row.chart}</TableCell>
                  <TableCell>{row.variableTypes}</TableCell>
                  <TableCell>{row.explanation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  GanttChartSquare, AreaChart, LineChart as LineChartIcon, ScatterChart as ScatterIcon, 
  BarChart as BarChartIcon, PieChart as PieChartIcon, Box, Dot, Heater, 
  MoveRight, Play, Share2, Sparkles, RefreshCw, Layers, TrendingUp, Grid3X3,
  Palette, Upload, FileSpreadsheet, Loader2, X, Database,
  GitBranch, Target, Activity, Settings, Download, ChevronDown, Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart as RechartsAreaChart, Area,
  ScatterChart, Scatter,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ComposedChart
} from 'recharts';
import { generateVisualization, datasetToPayload, type VisualizationResponse } from '@/lib/visualization-api';
import { UserNav } from '@/components/user-nav';
import DataUploader from '@/components/data-uploader';

// Types
type CellValue = string | number | null;
type DataRow = Record<string, CellValue>;
type DataSet = DataRow[];

// Colors
const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

// Dynamic Chart Renderer
const DynamicChart = ({ chartType, data }: { chartType: string; data: any }) => {
  if (!data || !data.chartData) return null;
  
  const { chartData, xLabel, yLabel, groups, lines, variables, label } = data;
  const tooltipStyle = { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' };

  switch (chartType) {
    case 'histogram':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="bin" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'density':
    case 'ecdf':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <RechartsAreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="x" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="density" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
          </RechartsAreaChart>
        </ResponsiveContainer>
      );

    case 'bar':
    case 'column':
    case 'lollipop':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} layout={chartType === 'bar' ? 'vertical' : 'horizontal'}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            {chartType === 'bar' ? (
              <>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
              </>
            )}
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'scatter':
    case 'regression':
    case 'bubble':
    case 'pca':
    case 'cluster':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="x" name={xLabel} tick={{ fontSize: 12 }} />
            <YAxis dataKey="y" name={yLabel} tick={{ fontSize: 12 }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Scatter data={chartData} fill="hsl(var(--primary))">
              {chartData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.cluster !== undefined ? COLORS[entry.cluster % COLORS.length] : COLORS[0]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      );

    case 'line':
    case 'area':
      return (
        <ResponsiveContainer width="100%" height={400}>
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="x" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip contentStyle={tooltipStyle} />
              <Legend />
              {(lines || ['y']).map((line: string, i: number) => (
                <Line key={line} type="monotone" dataKey={line} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          ) : (
            <RechartsAreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="x" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip contentStyle={tooltipStyle} />
              <Legend />
              {(lines || ['y']).map((line: string, i: number) => (
                <Area key={line} type="monotone" dataKey={line} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.3} />
              ))}
            </RechartsAreaChart>
          )}
        </ResponsiveContainer>
      );

    case 'pie':
    case 'donut':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={chartType === 'donut' ? 140 : 150}
              innerRadius={chartType === 'donut' ? 80 : 0}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'grouped-bar':
    case 'stacked-bar':
    case 'stacked-column':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend />
            {(groups || []).map((group: string, i: number) => (
              <Bar key={group} dataKey={group} fill={COLORS[i % COLORS.length]} stackId={chartType.includes('stacked') ? 'stack' : undefined} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );

    case 'heatmap':
      const vars = variables || [];
      const size = vars.length;
      return (
        <div className="p-4">
          <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${size}, 1fr)` }}>
            <div></div>
            {vars.map((v: string) => (<div key={v} className="text-xs font-medium text-center truncate px-1">{v}</div>))}
            {vars.map((rowVar: string) => (
              <div key={`row-${rowVar}`} className="contents">
                <div className="text-xs font-medium text-right pr-2 flex items-center justify-end">{rowVar}</div>
                {vars.map((colVar: string) => {
                  const cell = chartData.find((c: any) => c.x === colVar && c.y === rowVar);
                  const value = cell?.value || 0;
                  const color = value > 0 ? `rgba(59, 130, 246, ${Math.abs(value)})` : `rgba(239, 68, 68, ${Math.abs(value)})`;
                  return (
                    <div key={`${rowVar}-${colVar}`} className="aspect-square rounded flex items-center justify-center text-xs font-medium" style={{ backgroundColor: color, color: Math.abs(value) > 0.5 ? 'white' : 'black' }}>
                      {value.toFixed(2)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      );

    case 'scree':
    case 'pareto':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={chartType === 'scree' ? 'component' : 'name'} tick={{ fontSize: 11 }} angle={chartType === 'pareto' ? -45 : 0} textAnchor={chartType === 'pareto' ? 'end' : 'middle'} height={chartType === 'pareto' ? 80 : 30} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 100]} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar yAxisId="left" dataKey={chartType === 'scree' ? 'variance' : 'value'} fill="hsl(var(--primary))" name={chartType === 'scree' ? 'Individual' : 'Count'} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#ef4444" strokeWidth={2} name="Cumulative %" dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      );

    case 'funnel':
      return (
        <div className="space-y-2 p-4">
          {chartData.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-24 text-sm text-right truncate">{item.name}</div>
              <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium" style={{ width: `${item.percent}%`, backgroundColor: COLORS[i % COLORS.length] }}>
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      );

    case 'kpi':
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="text-5xl font-bold text-primary mb-2">
            {typeof chartData.value === 'number' ? chartData.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : chartData.value}
          </div>
          <div className="text-lg text-muted-foreground mb-4">Average {label}</div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span>Min: {chartData.min?.toFixed(2)}</span>
            <span>Max: {chartData.max?.toFixed(2)}</span>
            <span>Count: {chartData.count}</span>
          </div>
        </div>
      );

    case 'box':
    case 'violin':
      return (
        <div className="p-4 space-y-4">
          {chartData.map((box: any, i: number) => {
            const range = chartData.reduce((acc: any, b: any) => ({ min: Math.min(acc.min, b.min), max: Math.max(acc.max, b.max) }), { min: Infinity, max: -Infinity });
            const scale = (v: number) => ((v - range.min) / (range.max - range.min)) * 100;
            return (
              <div key={i} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium truncate">{box.group}</div>
                <div className="flex-1 relative h-12">
                  <div className="absolute top-1/2 h-0.5 bg-muted-foreground/40" style={{ left: `${scale(box.min)}%`, right: `${100 - scale(box.max)}%` }} />
                  <div className="absolute top-1 bottom-1 bg-primary/20 border-2 border-primary rounded" style={{ left: `${scale(box.q1)}%`, right: `${100 - scale(box.q3)}%` }} />
                  <div className="absolute top-1 bottom-1 w-0.5 bg-primary" style={{ left: `${scale(box.median)}%` }} />
                </div>
                <div className="w-20 text-xs text-muted-foreground">Med: {box.median.toFixed(1)}</div>
              </div>
            );
          })}
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Chart type "{chartType}" preview
        </div>
      );
  }
};

// Chart categories
const chartCategories = [
  { id: 'distribution', label: 'Distribution', icon: Layers, description: 'Analyze data spread' },
  { id: 'relationship', label: 'Relationship', icon: TrendingUp, description: 'Find correlations' },
  { id: 'categorical', label: 'Categorical', icon: Grid3X3, description: 'Compare categories' },
  { id: 'advanced', label: 'Advanced', icon: GitBranch, description: 'Statistical & ML' },
];

// Chart types by category
const chartTypes: Record<string, { id: string; label: string; icon: any; reqNum?: number; reqCat?: number; desc?: string }[]> = {
  distribution: [
    { id: 'histogram', label: 'Histogram', icon: BarChartIcon, reqNum: 1, desc: 'Frequency distribution' },
    { id: 'density', label: 'Density', icon: AreaChart, reqNum: 1, desc: 'Probability curve' },
    { id: 'box', label: 'Box Plot', icon: Box, reqNum: 1, desc: 'Quartiles & outliers' },
    { id: 'violin', label: 'Violin', icon: GanttChartSquare, reqNum: 1, desc: 'Distribution shape' },
    { id: 'ecdf', label: 'ECDF', icon: LineChartIcon, reqNum: 1, desc: 'Cumulative dist.' },
  ],
  relationship: [
    { id: 'scatter', label: 'Scatter', icon: ScatterIcon, reqNum: 2, desc: 'Correlation' },
    { id: 'bubble', label: 'Bubble', icon: Dot, reqNum: 3, desc: '3-variable scatter' },
    { id: 'line', label: 'Line', icon: LineChartIcon, reqNum: 2, desc: 'Time series' },
    { id: 'area', label: 'Area', icon: AreaChart, reqNum: 2, desc: 'Filled line' },
    { id: 'heatmap', label: 'Heatmap', icon: Heater, reqNum: 2, desc: 'Correlation matrix' },
  ],
  categorical: [
    { id: 'bar', label: 'Bar', icon: BarChartIcon, reqCat: 1, desc: 'Horizontal' },
    { id: 'column', label: 'Column', icon: BarChartIcon, reqCat: 1, desc: 'Vertical' },
    { id: 'pareto', label: 'Pareto', icon: BarChartIcon, reqCat: 1, desc: '80/20 rule' },
    { id: 'grouped-bar', label: 'Grouped', icon: BarChartIcon, reqCat: 2, reqNum: 1, desc: 'Compare groups' },
    { id: 'stacked-bar', label: 'Stacked', icon: BarChartIcon, reqCat: 2, reqNum: 1, desc: 'Part-to-whole' },
    { id: 'pie', label: 'Pie', icon: PieChartIcon, reqCat: 1, desc: 'Proportions' },
    { id: 'donut', label: 'Donut', icon: PieChartIcon, reqCat: 1, desc: 'Ring chart' },
    { id: 'funnel', label: 'Funnel', icon: GanttChartSquare, reqCat: 1, desc: 'Process stages' },
  ],
  advanced: [
    { id: 'pca', label: 'PCA', icon: ScatterIcon, reqNum: 2, desc: 'Dimensionality reduction' },
    { id: 'scree', label: 'Scree', icon: LineChartIcon, reqNum: 2, desc: 'Variance explained' },
    { id: 'cluster', label: 'Cluster', icon: Dot, reqNum: 2, desc: 'K-Means clustering' },
    { id: 'kpi', label: 'KPI Card', icon: Target, reqNum: 1, desc: 'Key metric' },
  ]
};

export default function VisualizationPage() {
  const { toast } = useToast();
  
  // Data state
  const [data, setData] = useState<DataSet>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isFileLoading, setIsFileLoading] = useState(false);
  
  // Derived headers
  const allHeaders = useMemo(() => data.length > 0 ? Object.keys(data[0]) : [], [data]);
  const { numericHeaders, categoricalHeaders } = useMemo(() => {
    if (data.length === 0) return { numericHeaders: [], categoricalHeaders: [] };
    const numeric: string[] = [], categorical: string[] = [];
    allHeaders.forEach(header => {
      const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
      const numericCount = values.filter(v => !isNaN(parseFloat(String(v)))).length;
      (numericCount > values.length * 0.5 ? numeric : categorical).push(header);
    });
    return { numericHeaders: numeric, categoricalHeaders: categorical };
  }, [data, allHeaders]);

  // UI state
  const [activeCategory, setActiveCategory] = useState('distribution');
  const [activeChart, setActiveChart] = useState<string | null>(null);

  // Chart config states
  const [distColumn, setDistColumn] = useState<string | undefined>();
  const [groupColumn, setGroupColumn] = useState<string | undefined>();
  const [barColumn, setBarColumn] = useState<string | undefined>();
  const [scatterX, setScatterX] = useState<string | undefined>();
  const [scatterY, setScatterY] = useState<string | undefined>();
  const [scatterGroup, setScatterGroup] = useState<string | undefined>();
  const [bubbleX, setBubbleX] = useState<string | undefined>();
  const [bubbleY, setBubbleY] = useState<string | undefined>();
  const [bubbleZ, setBubbleZ] = useState<string | undefined>();
  const [pieNameCol, setPieNameCol] = useState<string | undefined>();
  const [pieValueCol, setPieValueCol] = useState<string | undefined>();
  const [cat1, setCat1] = useState<string | undefined>();
  const [cat2, setCat2] = useState<string | undefined>();
  const [valueCol, setValueCol] = useState<string | undefined>();
  const [heatmapVars, setHeatmapVars] = useState<string[]>([]);
  const [nClusters, setNClusters] = useState<number>(3);

  const [analysisResult, setAnalysisResult] = useState<VisualizationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canRun = data.length > 0 && allHeaders.length > 0;

  // File Parsing
  const parseFile = useCallback((file: File): Promise<{ headers: string[]; rows: DataSet }> => {
    return new Promise((resolve, reject) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'json') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target?.result as string);
            if (Array.isArray(json) && json.length > 0 && typeof json[0] === 'object') {
              resolve({ headers: Object.keys(json[0]), rows: json });
            } else reject(new Error('Unsupported JSON format'));
          } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('Read failed'));
        reader.readAsText(file);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const arrayData = new Uint8Array(e.target?.result as ArrayBuffer);
            const wb = XLSX.read(arrayData, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            if (jsonData.length > 0) {
              const headers = (jsonData[0] as string[]).map((h, i) => h?.toString() || `Column ${i + 1}`);
              const rows: DataSet = jsonData.slice(1).map(row => {
                const obj: DataRow = {};
                headers.forEach((h, i) => obj[h] = row[i] ?? null);
                return obj;
              });
              resolve({ headers, rows });
            } else reject(new Error('Empty file'));
          } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('Read failed'));
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const parsed = Papa.parse(e.target?.result as string, { header: true, skipEmptyLines: true });
          if (parsed.data.length > 0) resolve({ headers: parsed.meta.fields || Object.keys(parsed.data[0] as object), rows: parsed.data as DataSet });
          else reject(new Error('Empty file'));
        };
        reader.onerror = () => reject(new Error('Read failed'));
        reader.readAsText(file);
      }
    });
  }, []);

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsFileLoading(true);
    try {
      const { rows } = await parseFile(files[0]);
      setData(rows);
      setFileName(files[0].name);
      setAnalysisResult(null);
      setActiveChart(null);
      toast({ title: 'Success', description: `${files[0].name}: ${rows.length} rows loaded` });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to parse file', variant: 'destructive' });
    }
    setIsFileLoading(false);
  }, [parseFile, toast]);

  const loadSampleData = useCallback(() => {
    const sampleData: DataSet = [
      { ID: '001', Name: 'John', Age: 25, City: 'New York', Score: 85.5, Grade: 'B', Dept: 'Sales' },
      { ID: '002', Name: 'Jane', Age: 30, City: 'LA', Score: 92.3, Grade: 'A', Dept: 'Marketing' },
      { ID: '003', Name: 'Bob', Age: 35, City: 'Chicago', Score: 78.1, Grade: 'C', Dept: 'Sales' },
      { ID: '004', Name: 'Alice', Age: 28, City: 'Houston', Score: 88.7, Grade: 'B', Dept: 'Engineering' },
      { ID: '005', Name: 'Charlie', Age: 32, City: 'Phoenix', Score: 95.2, Grade: 'A', Dept: 'Engineering' },
      { ID: '006', Name: 'Diana', Age: 27, City: 'Boston', Score: 91.0, Grade: 'A', Dept: 'Marketing' },
      { ID: '007', Name: 'Eric', Age: 29, City: 'Seattle', Score: 82.5, Grade: 'B', Dept: 'Sales' },
      { ID: '008', Name: 'Fiona', Age: 31, City: 'Miami', Score: 84.5, Grade: 'B', Dept: 'HR' },
      { ID: '009', Name: 'George', Age: 27, City: 'Denver', Score: 89.2, Grade: 'B', Dept: 'Engineering' },
      { ID: '010', Name: 'Helen', Age: 33, City: 'Austin', Score: 76.8, Grade: 'C', Dept: 'HR' },
    ];
    setData(sampleData);
    setFileName('Sample Data');
    setAnalysisResult(null);
    setActiveChart(null);
    toast({ title: 'Success', description: '10 rows loaded' });
  }, [toast]);

  // Update defaults when data changes
  useEffect(() => {
    if (numericHeaders.length > 0) {
      setDistColumn(numericHeaders[0]);
      setScatterX(numericHeaders[0]);
      setScatterY(numericHeaders[1] || numericHeaders[0]);
      setBubbleX(numericHeaders[0]);
      setBubbleY(numericHeaders[1] || numericHeaders[0]);
      setBubbleZ(numericHeaders[2] || numericHeaders[0]);
      setValueCol(numericHeaders[0]);
      setHeatmapVars(numericHeaders.slice(0, 5));
    }
    if (categoricalHeaders.length > 0) {
      setBarColumn(categoricalHeaders[0]);
      setPieNameCol(categoricalHeaders[0]);
      setCat1(categoricalHeaders[0]);
      setCat2(categoricalHeaders[1] || categoricalHeaders[0]);
      setGroupColumn(categoricalHeaders[0]);
    }
  }, [numericHeaders, categoricalHeaders]);

  // Build config
  const buildConfig = useCallback((chartType: string) => {
    const config: any = {};
    
    switch (chartType) {
      case 'histogram': case 'density': case 'ecdf':
        config.x_col = distColumn;
        if (groupColumn) config.group_col = groupColumn;
        break;
      case 'box': case 'violin':
        config.x_col = distColumn;
        config.group_col = groupColumn;
        break;
      case 'bar': case 'column': case 'lollipop': case 'pareto': case 'funnel':
        config.x_col = barColumn;
        break;
      case 'kpi':
        config.x_col = distColumn;
        break;
      case 'scatter': case 'regression': case 'line': case 'area':
        config.x_col = scatterX;
        config.y_col = scatterY;
        if (scatterGroup) config.group_col = scatterGroup;
        break;
      case 'bubble':
        config.x_col = bubbleX;
        config.y_col = bubbleY;
        config.size_col = bubbleZ;
        break;
      case 'heatmap':
        config.variables = heatmapVars;
        break;
      case 'pie': case 'donut':
        config.name_col = pieNameCol;
        config.value_col = pieValueCol;
        break;
      case 'grouped-bar': case 'stacked-bar': case 'stacked-column':
        config.x_col = cat1;
        config.y_col = valueCol;
        config.group_col = cat2;
        break;
      case 'pca': case 'scree': case 'cluster':
        config.variables = heatmapVars.length >= 2 ? heatmapVars : numericHeaders;
        if (chartType === 'cluster') config.n_clusters = nClusters;
        break;
    }
    
    return config;
  }, [distColumn, groupColumn, barColumn, scatterX, scatterY, scatterGroup, bubbleX, bubbleY, bubbleZ, pieNameCol, pieValueCol, cat1, cat2, valueCol, heatmapVars, numericHeaders, nClusters]);

  // Run Analysis - Backend API call
  const handleRunAnalysis = useCallback(async (chartType: string) => {
    setActiveChart(chartType);
    setIsLoading(true);
    setAnalysisResult(null);
    
    try {
      const config = buildConfig(chartType);
      const payload = datasetToPayload(data);
      
      const result = await generateVisualization(payload, chartType, config);
      
      if (result.success) {
        setAnalysisResult(result);
      } else {
        throw new Error('Chart generation failed');
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Unknown error', variant: 'destructive' });
      setAnalysisResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [data, toast, buildConfig]);

  const clearData = useCallback(() => {
    setData([]);
    setFileName('');
    setAnalysisResult(null);
    setActiveChart(null);
  }, []);

  // Check if chart is available
  const isChartDisabled = (chart: typeof chartTypes.distribution[0]) => {
    const numLen = numericHeaders.length;
    const catLen = categoricalHeaders.length;
    if (chart.reqNum && numLen < chart.reqNum) return true;
    if (chart.reqCat && catLen < chart.reqCat) return true;
    return false;
  };

  // Config type
  const getConfigType = (chart: string | null) => {
    if (!chart) return 'none';
    if (['histogram', 'density', 'ecdf'].includes(chart)) return 'single_numeric';
    if (['box', 'violin'].includes(chart)) return 'numeric_with_group';
    if (['bar', 'column', 'lollipop', 'pareto', 'funnel'].includes(chart)) return 'single_categorical';
    if (['scatter', 'regression', 'line', 'area'].includes(chart)) return 'xy_scatter';
    if (['bubble'].includes(chart)) return 'bubble';
    if (['pie', 'donut'].includes(chart)) return 'pie';
    if (['grouped-bar', 'stacked-bar', 'stacked-column'].includes(chart)) return 'grouped';
    if (['heatmap'].includes(chart)) return 'multi_var';
    if (['pca', 'scree', 'cluster'].includes(chart)) return 'pca';
    if (['kpi'].includes(chart)) return 'kpi';
    return 'none';
  };

  const configType = getConfigType(activeChart);
  const selectedInfo = activeChart ? chartTypes[activeCategory]?.find(c => c.id === activeChart) : null;

  const [openCategories, setOpenCategories] = useState<string[]>(['distribution']);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Filter chart types based on search
  const filteredChartCategories = useMemo(() => {
    if (!searchTerm) return chartCategories;
    const lowercased = searchTerm.toLowerCase();
    return chartCategories.filter(cat => {
      const hasMatchingCharts = chartTypes[cat.id]?.some(chart => 
        chart.label.toLowerCase().includes(lowercased) || 
        chart.desc?.toLowerCase().includes(lowercased)
      );
      return hasMatchingCharts || cat.label.toLowerCase().includes(lowercased);
    });
  }, [searchTerm]);

  return (
    <SidebarProvider>
      <div 
        className="flex min-h-screen w-full relative"
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={e => { 
          e.preventDefault(); 
          setIsDragOver(false); 
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) processFiles(files);
        }}
      >
        {/* Drag & Drop Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-background rounded-2xl shadow-2xl p-12 text-center border-2 border-dashed border-primary">
              <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Drop files here</h3>
              <p className="text-muted-foreground">CSV, Excel, JSON supported</p>
            </div>
          </div>
        )}

        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <BarChartIcon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Visualization</h1>
            </div>
            <div className="p-2 space-y-2">
              <DataUploader
                onFileSelected={(file) => processFiles([file])}
                loading={isFileLoading}
              />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search charts..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="pl-9" 
                />
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarMenu>
              {filteredChartCategories.map(category => (
                <Collapsible 
                  key={category.id} 
                  open={openCategories.includes(category.id)} 
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-base px-2 font-semibold shadow-md border bg-white text-foreground hover:bg-slate-50"
                    >
                      <category.icon className="mr-2 h-5 w-5" />
                      <span>{category.label}</span>
                      <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes(category.id) && 'rotate-180')} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu>
                      {chartTypes[category.id]?.map(chart => {
                        const disabled = isChartDisabled(chart);
                        return (
                          <SidebarMenuItem key={chart.id}>
                            <SidebarMenuButton
                              onClick={() => {
                                if (!disabled) {
                                  setActiveCategory(category.id);
                                  setActiveChart(chart.id);
                                }
                              }}
                              isActive={activeChart === chart.id}
                              disabled={disabled}
                              className={disabled ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              {chart.icon && <chart.icon />}
                              {chart.label}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarContent>

        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between border-b pb-4">
              <SidebarTrigger className="md:hidden" />
              <div className="flex-1 flex justify-center">
                <h1 className="text-xl font-headline font-bold flex items-center gap-2">
                  <BarChartIcon className="h-5 w-5" />
                  Visualization
                </h1>
              </div>
              <UserNav />
            </header>

            {/* Data Preview - Only show when data is loaded */}
            {canRun && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{fileName}</CardTitle>
                        <CardDescription>{data.length} rows × {allHeaders.length} columns</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{numericHeaders.length} numeric</Badge>
                      <Badge variant="outline">{categoricalHeaders.length} categorical</Badge>
                      <Button variant="ghost" size="sm" onClick={loadSampleData}>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Reset
                      </Button>
                      <Button variant="ghost" size="icon" onClick={clearData}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* Configuration Panel */}
            {activeChart && canRun && configType !== 'none' && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{selectedInfo?.label} Configuration</CardTitle>
                        <CardDescription className="text-xs">{selectedInfo?.desc}</CardDescription>
                      </div>
                    </div>
                    <Button 
                      onClick={() => activeChart && handleRunAnalysis(activeChart)}
                      disabled={!activeChart || !canRun || isLoading}
                      size="sm"
                    >
                      {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      {isLoading ? 'Running...' : 'Run'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Single Numeric */}
                  {configType === 'single_numeric' && (
                    <div className="grid grid-cols-2 gap-4 max-w-2xl">
                      <div>
                        <Label className="text-sm">Variable</Label>
                        <Select value={distColumn} onValueChange={setDistColumn}>
                          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Group By (optional)</Label>
                        <Select value={groupColumn ?? 'none'} onValueChange={v => setGroupColumn(v === 'none' ? undefined : v)}>
                          <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Numeric with Group */}
                  {configType === 'numeric_with_group' && (
                    <div className="grid grid-cols-2 gap-4 max-w-2xl">
                      <div>
                        <Label className="text-sm">Numeric Variable</Label>
                        <Select value={distColumn} onValueChange={setDistColumn}>
                          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Group By</Label>
                        <Select value={groupColumn ?? 'none'} onValueChange={v => setGroupColumn(v === 'none' ? undefined : v)}>
                          <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Single Categorical */}
                  {configType === 'single_categorical' && (
                    <div className="max-w-md">
                      <Label className="text-sm">Category</Label>
                      <Select value={barColumn} onValueChange={setBarColumn}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* XY Scatter */}
                  {configType === 'xy_scatter' && (
                    <div className="grid grid-cols-3 gap-4 max-w-3xl">
                      <div>
                        <Label className="text-sm">X-Axis</Label>
                        <Select value={scatterX} onValueChange={setScatterX}>
                          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Y-Axis</Label>
                        <Select value={scatterY} onValueChange={setScatterY}>
                          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {numericHeaders.filter(h => h !== scatterX).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Color By (optional)</Label>
                        <Select value={scatterGroup ?? 'none'} onValueChange={v => setScatterGroup(v === 'none' ? undefined : v)}>
                          <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Bubble */}
                  {configType === 'bubble' && (
                    <div className="grid grid-cols-3 gap-4 max-w-3xl">
                      <div>
                        <Label className="text-sm">X-Axis</Label>
                        <Select value={bubbleX} onValueChange={setBubbleX}>
                          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Y-Axis</Label>
                        <Select value={bubbleY} onValueChange={setBubbleY}>
                          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Size</Label>
                        <Select value={bubbleZ} onValueChange={setBubbleZ}>
                          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Pie */}
                  {configType === 'pie' && (
                    <div className="grid grid-cols-2 gap-4 max-w-2xl">
                      <div>
                        <Label className="text-sm">Category</Label>
                        <Select value={pieNameCol} onValueChange={setPieNameCol}>
                          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Value (optional)</Label>
                        <Select value={pieValueCol ?? 'none'} onValueChange={v => setPieValueCol(v === 'none' ? undefined : v)}>
                          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Count" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Count</SelectItem>
                            {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Grouped */}
                  {configType === 'grouped' && (
                    <div className="grid grid-cols-3 gap-4 max-w-3xl">
                      <div>
                        <Label className="text-sm">Category</Label>
                        <Select value={cat1} onValueChange={setCat1}>
                          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Group By</Label>
                        <Select value={cat2} onValueChange={setCat2}>
                          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {categoricalHeaders.filter(h => h !== cat1).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Value</Label>
                        <Select value={valueCol} onValueChange={setValueCol}>
                          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Multi Variable */}
                  {(configType === 'multi_var' || configType === 'pca') && (
                    <div className="space-y-4">
                      <div className="max-w-lg">
                        <Label className="text-sm">Variables (select 2+)</Label>
                        <ScrollArea className="h-32 border rounded-lg p-3 mt-1.5 bg-muted/50">
                          {numericHeaders.map(h => (
                            <div key={h} className="flex items-center gap-2 py-1.5">
                              <Checkbox
                                checked={heatmapVars.includes(h)}
                                onCheckedChange={c => setHeatmapVars(prev => c ? [...prev, h] : prev.filter(i => i !== h))}
                              />
                              <Label className="text-sm">{h}</Label>
                            </div>
                          ))}
                        </ScrollArea>
                        <p className="text-xs text-muted-foreground mt-2">Selected: {heatmapVars.length}</p>
                      </div>
                      {activeChart === 'cluster' && (
                        <div className="max-w-xs">
                          <Label className="text-sm">Number of Clusters (k)</Label>
                          <Input
                            type="number"
                            min={2}
                            max={10}
                            value={nClusters}
                            onChange={e => setNClusters(parseInt(e.target.value) || 3)}
                            className="mt-1.5"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* KPI */}
                  {configType === 'kpi' && (
                    <div className="max-w-md">
                      <Label className="text-sm">Metric</Label>
                      <Select value={distColumn} onValueChange={setDistColumn}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Result Area */}
            <Card className="flex-1">
              {isLoading ? (
                <CardContent className="h-full flex items-center justify-center min-h-[400px]">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-muted-foreground">Generating chart...</p>
                  </div>
                </CardContent>
              ) : analysisResult?.success && analysisResult?.data ? (
                <>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedInfo?.label || 'Chart'}</CardTitle>
                        <CardDescription>{selectedInfo?.desc} • {analysisResult.dataInfo?.rows} rows</CardDescription>
                      </div>
                      <Badge variant="secondary">Interactive</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DynamicChart chartType={analysisResult.chartType} data={analysisResult.data} />
                  </CardContent>
                </>
              ) : !canRun ? (
                <CardContent className="h-full flex items-center justify-center min-h-[400px]">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                      <Upload className="w-10 h-10 text-primary/60" />
                    </div>
                    <h3 className="text-xl font-semibold text-primary mb-2">No Data Loaded</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">Upload a dataset or use sample data to get started</p>
                    <div className="flex gap-3">
                      <Button onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />Upload
                      </Button>
                      <Button variant="outline" onClick={loadSampleData}>
                        <Sparkles className="w-4 h-4 mr-2" />Sample
                      </Button>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) processFiles(files);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="hidden"
                      accept=".csv,.xlsx,.xls,.json"
                    />
                  </div>
                </CardContent>
              ) : (
                <CardContent className="h-full flex items-center justify-center min-h-[400px]">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                      <BarChartIcon className="w-10 h-10 text-primary/60" />
                    </div>
                    <h3 className="text-xl font-semibold text-primary mb-2">Ready to Visualize</h3>
                    <p className="text-muted-foreground max-w-md">
                      Select a chart type from the sidebar, configure your variables, then click <strong>Generate Chart</strong>
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}


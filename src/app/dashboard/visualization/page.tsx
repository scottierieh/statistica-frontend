
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  GanttChartSquare, AreaChart, LineChart as LineChartIcon, ScatterChart as ScatterIcon, 
  BarChart as BarChartIcon, PieChart as PieChartIcon, Box, Dot, Heater, 
  MoveRight, Play, ArrowLeft, ChevronLeft, ChevronRight, Share2,
  Eye, EyeOff, Download, Sparkles, RefreshCw, Layers, TrendingUp, Grid3X3,
  Palette, Maximize2, Upload, FileSpreadsheet, Loader2, X, Database,
  GitBranch, Target, Activity, HelpCircle, Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

// Types
type CellValue = string | number | null;
type DataRow = Record<string, CellValue>;
type DataSet = DataRow[];

// Colors for charts
const COLORS = ['#1e3a5f', '#2d5a27', '#8b4513', '#4a1c40', '#1f4e5f', '#3d1a1a', '#2e4a3e', '#4a3728', '#1a3a4a', '#3e2a4a', '#2a4a2a', '#4a2a1a', '#1a2a4a', '#4a4a1a', '#3a1a4a', '#1a4a3a', '#4a1a3a', '#2a3a4a', '#4a3a2a', '#3a4a1a'];
// Dynamic Chart Renderer
const DynamicChart = ({ chartType, data }: { chartType: string; data: any }) => {
  if (!data || !data.chartData) return null;
  
  const { chartData, xLabel, yLabel, groups, lines, trendLine, variables, label } = data;
  const tooltipStyle = { backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' };

  switch (chartType) {
    case 'histogram':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="bin" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'density':
    case 'ecdf':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <RechartsAreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="x" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="density" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
          </RechartsAreaChart>
        </ResponsiveContainer>
      );

    case 'bar':
    case 'column':
    case 'lollipop':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} layout={chartType === 'bar' ? 'vertical' : 'horizontal'}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'scatter':
    case 'regression':
    case 'bubble':
    case 'hexbin':
    case 'pca':
    case 'cluster':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="x" name={xLabel} tick={{ fontSize: 12 }} label={{ value: xLabel, position: 'bottom', offset: -5, fontSize: 12 }} />
            <YAxis dataKey="y" name={yLabel} tick={{ fontSize: 12 }} label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 12 }} />
            <RechartsTooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={chartData} fill="#3b82f6">
              {chartData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.cluster !== undefined ? COLORS[entry.cluster % COLORS.length] : COLORS[0]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      );

    case 'line':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="x" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend />
            {(lines || ['y']).map((line: string, i: number) => (
              <Line key={line} type="monotone" dataKey={line} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );

    case 'area':
    case 'stream':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <RechartsAreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="x" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend />
            {(lines || ['y']).map((line: string, i: number) => (
              <Area key={line} type="monotone" dataKey={line} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.3} stackId={chartType === 'stream' ? '1' : undefined} />
            ))}
          </RechartsAreaChart>
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
              labelLine={{ stroke: '#6b7280' }}
            >
              {chartData.map((entry: any, index: number) => (
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
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
            {vars.map((rowVar: string, i: number) => (
              <div key={`row-${rowVar}`} className="contents">
                <div className="text-xs font-medium text-right pr-2 flex items-center justify-end">{rowVar}</div>
                {vars.map((colVar: string) => {
                  const cell = chartData.find((c: any) => c.x === colVar && c.y === rowVar);
                  const value = cell?.value || 0;
                  const color = value > 0 ? `rgba(59, 130, 246, ${Math.abs(value)})` : `rgba(239, 68, 68, ${Math.abs(value)})`;
                  return (
                    <div key={`${rowVar}-${colVar}`} className="aspect-square rounded flex items-center justify-center text-xs font-medium" style={{ backgroundColor: color, color: Math.abs(value) > 0.5 ? 'white' : 'black' }} title={`${rowVar} vs ${colVar}: ${value.toFixed(2)}`}>
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
      return (
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="component" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="variance" fill="#3b82f6" name="Individual" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="cumulative" stroke="#ef4444" strokeWidth={2} name="Cumulative" dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      );

    case 'pareto':
      return (
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 100]} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar yAxisId="left" dataKey="value" fill="#3b82f6" name="Count" radius={[4, 4, 0, 0]} />
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
              <div className="flex-1 h-8 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium" style={{ width: `${item.percent}%`, backgroundColor: COLORS[i % COLORS.length] }}>
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      );

    case 'kpi':
      const kpiData = chartData;
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="text-5xl font-bold text-primary mb-2">
            {typeof kpiData.value === 'number' ? kpiData.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : kpiData.value}
          </div>
          <div className="text-lg text-muted-foreground mb-4">Average {label}</div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span>Min: {kpiData.min?.toFixed(2)}</span>
            <span>Max: {kpiData.max?.toFixed(2)}</span>
            <span>Count: {kpiData.count}</span>
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
                  <div className="absolute top-1/2 h-0.5 bg-slate-400" style={{ left: `${scale(box.min)}%`, right: `${100 - scale(box.max)}%` }} />
                  <div className="absolute top-1 bottom-1 bg-blue-200 border-2 border-blue-500 rounded" style={{ left: `${scale(box.q1)}%`, right: `${100 - scale(box.q3)}%` }} />
                  <div className="absolute top-1 bottom-1 w-0.5 bg-blue-700" style={{ left: `${scale(box.median)}%` }} />
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
          Chart type "{chartType}" - Interactive version coming soon
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

// Helpers
function sanitize<T>(obj: T): T { return JSON.parse(JSON.stringify(obj ?? {})); }

// Main Component
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  // Chart config states
  const [distColumn, setDistColumn] = useState<string | undefined>();
  const [groupColumn, setGroupColumn] = useState<string | undefined>();
  const [barColumn, setBarColumn] = useState<string | undefined>();
  const [scatterX, setScatterX] = useState<string | undefined>();
  const [scatterY, setScatterY] = useState<string | undefined>();
  const [scatterTrend, setScatterTrend] = useState(false);
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
  const [networkSource, setNetworkSource] = useState<string | undefined>();
  const [networkTarget, setNetworkTarget] = useState<string | undefined>();
  const [nClusters, setNClusters] = useState<number>(3);

  const [analysisResult, setAnalysisResult] = useState<{ plot: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canRun = data.length > 0 && allHeaders.length > 0;
  const markDirty = () => setIsDirty(true);

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
      toast({ title: '✓ File Loaded', description: `${files[0].name}: ${rows.length} rows` });
    } catch (err) {
      toast({ title: 'Error', description: `Failed to parse file`, variant: 'destructive' });
    }
    setIsFileLoading(false);
  }, [parseFile, toast]);

  const loadSampleData = useCallback(() => {
    const sampleData: DataSet = [
      { ID: '001', Name: 'John', Age: 25, City: 'New York', Score: 85.5, Grade: 'B', Dept: 'Sales', Target: 80 },
      { ID: '002', Name: 'Jane', Age: 30, City: 'LA', Score: 92.3, Grade: 'A', Dept: 'Marketing', Target: 90 },
      { ID: '003', Name: 'Bob', Age: 35, City: 'Chicago', Score: 78.1, Grade: 'C', Dept: 'Sales', Target: 75 },
      { ID: '004', Name: 'Alice', Age: 28, City: 'Houston', Score: 88.7, Grade: 'B', Dept: 'Engineering', Target: 85 },
      { ID: '005', Name: 'Charlie', Age: 32, City: 'Phoenix', Score: 95.2, Grade: 'A', Dept: 'Engineering', Target: 90 },
      { ID: '006', Name: 'Diana', Age: 27, City: 'Boston', Score: 91.0, Grade: 'A', Dept: 'Marketing', Target: 88 },
      { ID: '007', Name: 'Eric', Age: 29, City: 'Seattle', Score: 82.5, Grade: 'B', Dept: 'Sales', Target: 80 },
      { ID: '008', Name: 'Fiona', Age: 31, City: 'Miami', Score: 84.5, Grade: 'B', Dept: 'HR', Target: 82 },
      { ID: '009', Name: 'George', Age: 27, City: 'Denver', Score: 89.2, Grade: 'B', Dept: 'Engineering', Target: 85 },
      { ID: '010', Name: 'Helen', Age: 33, City: 'Austin', Score: 76.8, Grade: 'C', Dept: 'HR', Target: 78 },
      { ID: '011', Name: 'Ivan', Age: 26, City: 'Portland', Score: 93.1, Grade: 'A', Dept: 'Marketing', Target: 90 },
      { ID: '012', Name: 'Julia', Age: 34, City: 'Atlanta', Score: 87.4, Grade: 'B', Dept: 'Sales', Target: 85 },
    ];
    setData(sampleData);
    setFileName('Sample Data');
    setAnalysisResult(null);
    setActiveChart(null);
    toast({ title: '✓ Sample Data', description: '12 rows loaded' });
  }, [toast]);

  // Update defaults
  useEffect(() => {
    if (numericHeaders && numericHeaders.length > 0) {
      setDistColumn(numericHeaders[0]);
      setScatterX(numericHeaders[0]);
      setScatterY(numericHeaders[1] || numericHeaders[0]);
      setBubbleX(numericHeaders[0]);
      setBubbleY(numericHeaders[1]);
      setBubbleZ(numericHeaders[2]);
      setValueCol(numericHeaders[0]);
      setHeatmapVars(numericHeaders.slice(0, 5));
    }
    if (categoricalHeaders && categoricalHeaders.length > 0) {
      setBarColumn(categoricalHeaders[0]);
      setPieNameCol(categoricalHeaders[0]);
      setCat1(categoricalHeaders[0]);
      setCat2(categoricalHeaders[1]);
      setGroupColumn(categoricalHeaders[0]);
    }
    if (allHeaders && allHeaders.length > 0) {
      setNetworkSource(allHeaders[0]);
      setNetworkTarget(allHeaders[1]);
    }
    setIsDirty(false);
  }, [numericHeaders, categoricalHeaders, allHeaders]);

  useEffect(() => {
    if (scatterY === scatterX && numericHeaders && numericHeaders.length > 1) {
      const alt = numericHeaders.find(h => h !== scatterX);
      if (alt) setScatterY(alt);
    }
  }, [scatterX, scatterY, numericHeaders]);

  // Build config based on chart type
  const buildConfig = useCallback((chartType: string) => {
    const baseConfig: any = {};
    
    switch (chartType) {
      // Distribution
      case 'histogram': case 'density': case 'ecdf': case 'qq':
        baseConfig.x_col = distColumn;
        if (groupColumn) baseConfig.group_col = groupColumn;
        break;
      case 'box': case 'violin': case 'ridgeline':
        baseConfig.x_col = distColumn;
        baseConfig.y_col = groupColumn;
        baseConfig.group_col = groupColumn;
        break;
      
      // Categorical - Simple
      case 'bar': case 'column': case 'lollipop': case 'pareto':
      case 'diverging_bar': case 'likert': case 'waterfall': case 'funnel':
        baseConfig.x_col = barColumn;
        break;
      case 'nps':
        baseConfig.x_col = barColumn;
        break;
      case 'kpi':
        baseConfig.x_col = distColumn;
        break;
      case 'bullet':
        baseConfig.x_col = distColumn;
        baseConfig.y_col = valueCol;
        break;
      
      // Relationship - Two Variables
      case 'scatter': case 'regression': case 'hexbin':
        baseConfig.x_col = scatterX;
        baseConfig.y_col = scatterY;
        baseConfig.trend_line = chartType === 'regression' || scatterTrend;
        if (scatterGroup) baseConfig.group_col = scatterGroup;
        break;
      case 'bubble':
        baseConfig.x_col = bubbleX;
        baseConfig.y_col = bubbleY;
        baseConfig.size_col = bubbleZ;
        break;
      case 'line': case 'area': case 'stream':
        baseConfig.x_col = scatterX;
        baseConfig.y_col = scatterY;
        if (scatterGroup) baseConfig.group_col = scatterGroup;
        break;
      
      // Heatmap / Matrix
      case 'heatmap': case 'scatter_matrix': case 'calendar_heatmap':
        baseConfig.variables = heatmapVars;
        break;
      
      // Part-to-whole
      case 'pie': case 'donut': case 'treemap': case 'sunburst':
        baseConfig.name_col = pieNameCol;
        baseConfig.value_col = pieValueCol;
        break;
      
      // Grouped/Stacked
      case 'grouped-bar': case 'stacked-bar': case 'stacked-column':
      case 'sankey': case 'chord': case 'alluvial': case 'mosaic':
        baseConfig.x_col = cat1;
        baseConfig.y_col = valueCol;
        baseConfig.group_col = cat2;
        break;
      
      // Network
      case 'network':
        baseConfig.source_col = networkSource;
        baseConfig.target_col = networkTarget;
        break;
      
      // Advanced / Statistical
      case 'pca': case 'scree': case 'cluster': case 'dendrogram':
        baseConfig.variables = heatmapVars.length >= 2 ? heatmapVars : numericHeaders;
        if (chartType === 'cluster') baseConfig.n_clusters = nClusters;
        break;
      
      default:
        break;
    }
    
    return baseConfig;
  }, [distColumn, groupColumn, barColumn, scatterX, scatterY, scatterTrend, scatterGroup, 
      bubbleX, bubbleY, bubbleZ, pieNameCol, pieValueCol, cat1, cat2, valueCol, 
      heatmapVars, networkSource, networkTarget, numericHeaders, nClusters]);

  // Run Analysis
  const handleRunAnalysis = useCallback(async (chartType: string) => {
    setActiveChart(chartType);
    
    try {
      const config = buildConfig(chartType);
      
      setIsLoading(true);
      setAnalysisResult(null);
      
      const payload = sanitize({ data, chartType, config });
      
      const response = await fetch('/api/analysis/visualization', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Request failed: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result?.success || !result?.data) throw new Error(result?.error || 'Chart not returned');
      
      setAnalysisResult(result);
      setIsDirty(false);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? 'Unknown error', variant: 'destructive' });
      setAnalysisResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [data, toast, buildConfig]);

  const clearData = useCallback(() => { setData([]); setFileName(''); setAnalysisResult(null); setActiveChart(null); }, []);

  const wrap = <T extends (...args: any[]) => any>(fn: T) => (...args: Parameters<T>) => { markDirty(); return fn(...args); };
  const numLen = numericHeaders?.length ?? 0, catLen = categoricalHeaders?.length ?? 0, allLen = allHeaders?.length ?? 0;

  // Chart types by category
  const chartTypes: Record<string, { id: string, label: string, icon: any, disabled?: boolean, desc?: string }[]> = {
    distribution: [
      { id: 'histogram', label: 'Histogram', icon: BarChartIcon, disabled: numLen === 0, desc: 'Frequency distribution' },
      { id: 'density', label: 'Density', icon: AreaChart, disabled: numLen === 0, desc: 'Probability curve' },
      { id: 'box', label: 'Box Plot', icon: Box, disabled: numLen === 0, desc: 'Quartiles & outliers' },
      { id: 'violin', label: 'Violin', icon: GanttChartSquare, disabled: numLen === 0, desc: 'Distribution shape' },
      { id: 'ridgeline', label: 'Ridgeline', icon: AreaChart, disabled: numLen === 0 || catLen === 0, desc: 'Stacked distributions' },
      { id: 'ecdf', label: 'ECDF', icon: LineChartIcon, disabled: numLen === 0, desc: 'Cumulative dist.' },
      { id: 'qq', label: 'Q-Q Plot', icon: ScatterIcon, disabled: numLen === 0, desc: 'Normality check' },
    ],
    relationship: [
      { id: 'scatter', label: 'Scatter', icon: ScatterIcon, disabled: numLen < 2, desc: 'Correlation' },
      { id: 'regression', label: 'Regression', icon: LineChartIcon, disabled: numLen < 2, desc: 'With trend line' },
      { id: 'hexbin', label: 'Hexbin', icon: ScatterIcon, disabled: numLen < 2, desc: 'Density scatter' },
      { id: 'bubble', label: 'Bubble', icon: Dot, disabled: numLen < 3, desc: '3-variable scatter' },
      { id: 'line', label: 'Line', icon: LineChartIcon, disabled: allLen < 2, desc: 'Time series' },
      { id: 'area', label: 'Area', icon: AreaChart, disabled: allLen < 2, desc: 'Filled line' },
      { id: 'stream', label: 'Stream', icon: AreaChart, disabled: allLen < 2, desc: 'Stacked flow' },
      { id: 'heatmap', label: 'Heatmap', icon: Heater, disabled: numLen < 2, desc: 'Correlation matrix' },
      { id: 'scatter_matrix', label: 'Matrix', icon: ScatterIcon, disabled: numLen < 2, desc: 'Pair plot' },
    ],
    categorical: [
      { id: 'bar', label: 'Bar', icon: BarChartIcon, disabled: catLen === 0, desc: 'Horizontal' },
      { id: 'column', label: 'Column', icon: BarChartIcon, disabled: catLen === 0, desc: 'Vertical' },
      { id: 'lollipop', label: 'Lollipop', icon: Dot, disabled: catLen === 0, desc: 'Dot with stem' },
      { id: 'pareto', label: 'Pareto', icon: BarChartIcon, disabled: catLen === 0, desc: '80/20 rule' },
      { id: 'grouped-bar', label: 'Grouped', icon: BarChartIcon, disabled: catLen < 2 || numLen < 1, desc: 'Compare groups' },
      { id: 'stacked-bar', label: 'Stacked', icon: BarChartIcon, disabled: catLen < 2 || numLen < 1, desc: 'Part-to-whole' },
      { id: 'stacked-column', label: 'Stacked Col', icon: BarChartIcon, disabled: catLen < 2 || numLen < 1, desc: 'Vertical stacked' },
      { id: 'pie', label: 'Pie', icon: PieChartIcon, disabled: catLen === 0, desc: 'Proportions' },
      { id: 'donut', label: 'Donut', icon: PieChartIcon, disabled: catLen === 0, desc: 'Ring chart' },
      { id: 'treemap', label: 'Treemap', icon: GanttChartSquare, disabled: catLen === 0, desc: 'Hierarchical' },
      { id: 'sunburst', label: 'Sunburst', icon: PieChartIcon, disabled: catLen === 0, desc: 'Radial hierarchy' },
      { id: 'sankey', label: 'Sankey', icon: MoveRight, disabled: catLen < 2, desc: 'Flow diagram' },
      { id: 'waterfall', label: 'Waterfall', icon: BarChartIcon, disabled: numLen === 0, desc: 'Cumulative' },
      { id: 'funnel', label: 'Funnel', icon: GanttChartSquare, disabled: catLen === 0, desc: 'Process stages' },
    ],
    advanced: [
      { id: 'pca', label: 'PCA', icon: ScatterIcon, disabled: numLen < 2, desc: 'Dimensionality reduction' },
      { id: 'scree', label: 'Scree', icon: LineChartIcon, disabled: numLen < 2, desc: 'Variance explained' },
      { id: 'cluster', label: 'Cluster', icon: Dot, disabled: numLen < 2, desc: 'K-Means clustering' },
      { id: 'dendrogram', label: 'Dendrogram', icon: GitBranch, disabled: numLen < 2, desc: 'Hierarchical clustering' },
      { id: 'network', label: 'Network', icon: Share2, disabled: allLen < 2, desc: 'Node-link graph' },
      { id: 'kpi', label: 'KPI Card', icon: Target, disabled: numLen === 0, desc: 'Key metric' },
      { id: 'bullet', label: 'Bullet', icon: Activity, disabled: numLen < 2, desc: 'Actual vs Target' },
      { id: 'diverging_bar', label: 'Diverging', icon: BarChartIcon, disabled: catLen === 0, desc: 'Pos/Neg values' },
    ]
  };

  const selectedInfo = activeChart ? chartTypes[activeCategory]?.find(c => c.id === activeChart) : null;

  // Determine which config UI to show
  const getConfigType = (chart: string | null) => {
    if (!chart) return 'none';
    if (['histogram', 'density', 'ecdf', 'qq'].includes(chart)) return 'single_numeric';
    if (['box', 'violin', 'ridgeline'].includes(chart)) return 'numeric_with_group';
    if (['bar', 'column', 'lollipop', 'pareto', 'diverging_bar', 'waterfall', 'funnel', 'likert', 'nps'].includes(chart)) return 'single_categorical';
    if (['scatter', 'regression', 'hexbin', 'line', 'area', 'stream'].includes(chart)) return 'xy_scatter';
    if (['bubble'].includes(chart)) return 'bubble';
    if (['pie', 'donut', 'treemap', 'sunburst'].includes(chart)) return 'pie';
    if (['grouped-bar', 'stacked-bar', 'stacked-column', 'sankey', 'chord', 'alluvial', 'mosaic'].includes(chart)) return 'grouped';
    if (['heatmap', 'scatter_matrix', 'calendar_heatmap'].includes(chart)) return 'multi_var';
    if (['pca', 'scree', 'cluster', 'dendrogram'].includes(chart)) return 'pca';
    if (['network'].includes(chart)) return 'network';
    if (['kpi'].includes(chart)) return 'kpi';
    if (['bullet'].includes(chart)) return 'bullet';
    return 'none';
  };

  const configType = getConfigType(activeChart);

  // Main UI
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-card">
          <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                  <Link href="/dashboard">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Workspace
                  </Link>
              </Button>
          </div>
          <div className="flex-1 flex justify-center">
              <Link href="/" className="flex items-center justify-center gap-2">
                  <BarChartIcon className="h-6 w-6 text-primary" />
                  <h1 className="text-xl font-headline font-bold">Visualization Studio</h1>
              </Link>
          </div>
          <div className="w-[220px]" />
      </header>

      <div className="flex flex-1 overflow-hidden" onDragOver={e => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }} onDrop={e => { e.preventDefault(); setIsDragOver(false); processFiles(Array.from(e.dataTransfer.files)); }}>
        
        <AnimatePresence>
          {isDragOver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-2xl p-12 text-center border-2 border-dashed border-primary">
                <Upload className="w-16 h-16 text-primary mx-auto mb-4" /><h3 className="text-2xl font-bold mb-2">Drop files here</h3>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="border-r border-slate-200 bg-white shadow-lg flex flex-col overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-lg">Tools & Data</h2>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Data Source - Upload Style */}
                  <input type="file" ref={fileInputRef} onChange={e => { const files = Array.from(e.target.files || []); if (files.length > 0) processFiles(files); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="hidden" accept=".csv,.xlsx,.xls,.json" />
                  
                  {canRun ? (
                    <Card className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]">{fileName}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600" onClick={clearData}><X className="w-4 h-4" /></Button>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">{data.length} rows × {allLen} cols</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => fileInputRef.current?.click()} disabled={isFileLoading}>
                            {isFileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Change"}
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={loadSampleData}>Sample</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div 
                      className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-slate-50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-700 mb-3">Upload Data</p>
                      <Button variant="outline" size="sm" disabled={isFileLoading}>
                        {isFileLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                        Choose File
                      </Button>
                      <p className="text-xs text-slate-400 mt-3">or</p>
                      <Button variant="link" size="sm" className="text-primary" onClick={(e) => { e.stopPropagation(); loadSampleData(); }}>
                        <Sparkles className="w-3 h-3 mr-1" />Use Sample Data
                      </Button>
                    </div>
                  )}

                  {/* Category */}
                  <Card className="border-slate-200">
                    <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Palette className="w-4 h-4 text-primary" />Category</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {chartCategories.map(cat => {
                        const Icon = cat.icon;
                        return (
                          <motion.button key={cat.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => { setActiveCategory(cat.id); setActiveChart(null); }}
                            className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${activeCategory === cat.id ? 'bg-primary text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100'}`}>
                            <Icon className="w-5 h-5" />
                            <div className="text-left"><p className="font-medium text-sm">{cat.label}</p><p className={`text-xs ${activeCategory === cat.id ? 'text-white/70' : 'text-muted-foreground'}`}>{cat.description}</p></div>
                          </motion.button>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Chart Type */}
                  <Card className="border-slate-200">
                    <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Grid3X3 className="w-4 h-4 text-primary" />Type{activeChart && <Badge className="ml-auto text-xs">{selectedInfo?.label}</Badge>}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-1.5">
                        {chartTypes[activeCategory]?.map(chart => {
                          const Icon = chart.icon;
                          return (
                            <TooltipProvider key={chart.id}><Tooltip><TooltipTrigger asChild>
                              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => !chart.disabled && setActiveChart(chart.id)} disabled={chart.disabled}
                                className={`p-2 rounded-lg flex flex-col items-center gap-0.5 transition-all ${activeChart === chart.id ? 'bg-primary text-white shadow-md' : chart.disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 hover:bg-slate-100'}`}>
                                <Icon className="w-4 h-4" /><span className="text-[10px] font-medium truncate w-full text-center">{chart.label}</span>
                              </motion.button>
                            </TooltipTrigger><TooltipContent><p className="font-medium">{chart.label}</p><p className="text-xs text-muted-foreground">{chart.desc}</p></TooltipContent></Tooltip></TooltipProvider>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <Card className="border-slate-200">
                    <CardContent className="pt-4 space-y-2">
                      <Button onClick={() => activeChart && handleRunAnalysis(activeChart)} disabled={!activeChart || !canRun || isLoading} className="w-full shadow-md" variant={isDirty ? "default" : "secondary"}>
                        {isLoading ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Generating...</> : <><Play className="w-4 h-4 mr-2" />Generate</>}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Sidebar toggle */}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="absolute top-1/2 -translate-y-1/2 bg-primary text-white p-2 rounded-r-lg shadow-lg z-20" style={{ left: sidebarCollapsed ? 0 : 320 }}>
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-6">
            {/* Config Panel */}
            <AnimatePresence mode="wait">
              {showConfig && activeChart && canRun && configType !== 'none' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6">
                  <Card className="border-slate-200 shadow-lg">
                    <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><Settings className="w-5 h-5 text-primary" /></div>
                          <div><CardTitle className="text-base">Configuration</CardTitle><CardDescription className="text-xs">{selectedInfo?.label} - {selectedInfo?.desc}</CardDescription></div>
                        </div>
                        <Button onClick={() => activeChart && handleRunAnalysis(activeChart)} disabled={!activeChart || !canRun || isLoading} variant={isDirty ? "default" : "secondary"} size="sm">
                          {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}{isLoading ? 'Running...' : 'Run'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5">
                      {/* Single Numeric */}
                      {configType === 'single_numeric' && (
                        <div className="grid grid-cols-2 gap-4 max-w-2xl">
                          <div><Label className="text-sm font-medium">Variable</Label><Select value={distColumn} onValueChange={wrap(setDistColumn)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(numericHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                          <div><Label className="text-sm font-medium">Group By (optional)</Label><Select value={groupColumn ?? 'none'} onValueChange={v => wrap(setGroupColumn)(v === 'none' ? undefined : v)}><SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{(categoricalHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                      )}
                      {/* Numeric with Group */}
                      {configType === 'numeric_with_group' && (
                        <div className="grid grid-cols-2 gap-4 max-w-2xl">
                          <div><Label className="text-sm font-medium">Numeric Variable</Label><Select value={distColumn} onValueChange={wrap(setDistColumn)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(numericHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                          <div><Label className="text-sm font-medium">Group By</Label><Select value={groupColumn ?? 'none'} onValueChange={v => wrap(setGroupColumn)(v === 'none' ? undefined : v)}><SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{(categoricalHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                      )}
                      {/* Single Categorical */}
                      {configType === 'single_categorical' && (
                        <div className="max-w-md">
                          <Label className="text-sm font-medium">Category</Label>
                          <Select value={barColumn} onValueChange={wrap(setBarColumn)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(categoricalHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                      )}
                      {/* XY Scatter */}
                      {configType === 'xy_scatter' && (
                        <div className="grid grid-cols-4 gap-4">
                          <div><Label className="text-sm font-medium">X-Axis</Label><Select value={scatterX} onValueChange={wrap(setScatterX)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(numericHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                          <div><Label className="text-sm font-medium">Y-Axis</Label><Select value={scatterY} onValueChange={wrap(setScatterY)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(numericHeaders || []).filter(h => h !== scatterX).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                          <div><Label className="text-sm font-medium">Color By</Label><Select value={scatterGroup ?? 'none'} onValueChange={v => wrap(setScatterGroup)(v === 'none' ? undefined : v)}><SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{(categoricalHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                          {['scatter', 'regression'].includes(activeChart || '') && <div className="flex items-end pb-1"><label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={scatterTrend} onCheckedChange={c => wrap(setScatterTrend)(!!c)} /><span className="text-sm">Trend Line</span></label></div>}
                        </div>
                      )}
                      {/* Bubble */}
                      {configType === 'bubble' && (
                        <div className="grid grid-cols-3 gap-4 max-w-3xl">
                          <div><Label className="text-sm font-medium">X-Axis</Label><Select value={bubbleX} onValueChange={wrap(setBubbleX)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(numericHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                          <div><Label className="text-sm font-medium">Y-Axis</Label><Select value={bubbleY} onValueChange={wrap(setBubbleY)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(numericHeaders || []).filter(h => h !== bubbleX).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                          <div><Label className="text-sm font-medium">Size</Label><Select value={bubbleZ} onValueChange={wrap(setBubbleZ)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(numericHeaders || []).filter(h => h !== bubbleX && h !== bubbleY).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                      )}
                      {/* Pie */}
                      {configType === 'pie' && (
                        <div className="grid grid-cols-2 gap-4 max-w-2xl">
                          <div><Label className="text-sm font-medium">Category</Label><Select value={pieNameCol} onValueChange={wrap(setPieNameCol)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(categoricalHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                          <div><Label className="text-sm font-medium">Value (optional)</Label><Select value={pieValueCol ?? 'none'} onValueChange={v => wrap(setPieValueCol)(v === 'none' ? undefined : v)}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Count" /></SelectTrigger><SelectContent><SelectItem value="none">Count</SelectItem>{(numericHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                      )}
                      {/* Grouped */}
                      {configType === 'grouped' && (
                        <div className="grid grid-cols-3 gap-4 max-w-3xl">
                          <div><Label className="text-sm font-medium">Category</Label><Select value={cat1} onValueChange={wrap(setCat1)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(categoricalHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                          <div><Label className="text-sm font-medium">Group By</Label><Select value={cat2} onValueChange={wrap(setCat2)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(categoricalHeaders || []).filter(h => h !== cat1).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                          <div><Label className="text-sm font-medium">Value</Label><Select value={valueCol} onValueChange={wrap(setValueCol)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(numericHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                      )}
                      {/* Multi Variable */}
                      {configType === 'multi_var' && (
                        <div className="max-w-lg">
                          <Label className="text-sm font-medium">Variables (select 2+)</Label>
                          <ScrollArea className="h-32 border rounded-lg p-3 mt-1.5 bg-slate-50">
                            {(numericHeaders || []).map(h => (<div key={h} className="flex items-center gap-2 py-1.5"><Checkbox checked={heatmapVars.includes(h)} onCheckedChange={c => { markDirty(); setHeatmapVars(prev => c ? [...prev, h] : prev.filter(i => i !== h)); }} /><Label className="text-sm">{h}</Label></div>))}
                          </ScrollArea>
                          <p className="text-xs text-muted-foreground mt-2">Selected: {heatmapVars.length}</p>
                        </div>
                      )}
                      {/* PCA */}
                      {configType === 'pca' && (
                        <div className="space-y-4">
                          <div className="max-w-lg">
                            <Label className="text-sm font-medium">Variables (select 2+)</Label>
                            <ScrollArea className="h-32 border rounded-lg p-3 mt-1.5 bg-slate-50">
                              {(numericHeaders || []).map(h => (<div key={h} className="flex items-center gap-2 py-1.5"><Checkbox checked={heatmapVars.includes(h)} onCheckedChange={c => { markDirty(); setHeatmapVars(prev => c ? [...prev, h] : prev.filter(i => i !== h)); }} /><Label className="text-sm">{h}</Label></div>))}
                            </ScrollArea>
                            <p className="text-xs text-muted-foreground mt-2">Selected: {heatmapVars.length}</p>
                          </div>
                          {activeChart === 'cluster' && (
                            <div className="max-w-xs">
                              <Label className="text-sm font-medium">Number of Clusters (k)</Label>
                              <Input type="number" min={2} max={10} value={nClusters} onChange={e => { markDirty(); setNClusters(parseInt(e.target.value) || 3); }} className="mt-1.5" />
                            </div>
                          )}
                        </div>
                      )}
                      {/* Network */}
                      {configType === 'network' && (
                        <div className="grid grid-cols-2 gap-4 max-w-2xl">
                          <div><Label className="text-sm font-medium">Source</Label><Select value={networkSource} onValueChange={wrap(setNetworkSource)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(allHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                          <div><Label className="text-sm font-medium">Target</Label><Select value={networkTarget} onValueChange={wrap(setNetworkTarget)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(allHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                      )}
                      {/* KPI */}
                      {configType === 'kpi' && (
                        <div className="max-w-md">
                          <Label className="text-sm font-medium">Metric</Label>
                          <Select value={distColumn} onValueChange={wrap(setDistColumn)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(numericHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                      )}
                      {/* Bullet */}
                      {configType === 'bullet' && (
                        <div className="grid grid-cols-2 gap-4 max-w-2xl">
                          <div><Label className="text-sm font-medium">Actual Value</Label><Select value={distColumn} onValueChange={wrap(setDistColumn)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(numericHeaders || []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                          <div><Label className="text-sm font-medium">Target Value</Label><Select value={valueCol} onValueChange={wrap(setValueCol)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{(numericHeaders || []).filter(h => h !== distColumn).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result */}
            <div ref={resultRef}>
              {isLoading ? (
                <Card className="shadow-xl border-0"><CardContent className="p-8"><div className="flex flex-col items-center justify-center space-y-4"><div className="relative"><div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0"></div></div><p className="text-muted-foreground">Generating chart...</p></div></CardContent></Card>
              ) : activeChart && analysisResult?.success && analysisResult?.data ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <Card className="shadow-xl border-0 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><BarChartIcon className="w-5 h-5 text-primary" /></div>
                          <div><CardTitle className="text-lg">{selectedInfo?.label || 'Chart'}</CardTitle><p className="text-xs text-muted-foreground">{selectedInfo?.desc} • Interactive</p></div>
                        </div>
                        <Badge variant="secondary" className="text-xs">{analysisResult.dataInfo?.rows} rows</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 bg-white">
                      <DynamicChart chartType={analysisResult.chartType} data={analysisResult.data} />
                    </CardContent>
                  </Card>
                </motion.div>
              ) : !canRun ? (
                <Card className="shadow-lg border-slate-200"><CardContent className="p-12"><div className="flex flex-col items-center justify-center text-center"><div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mb-6"><Upload className="w-10 h-10 text-amber-600" /></div><h3 className="text-xl font-semibold text-amber-700 mb-2">No Data</h3><p className="text-muted-foreground max-w-md mb-6">Upload a dataset or use sample data</p><div className="flex gap-3"><Button onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Upload</Button><Button variant="outline" onClick={loadSampleData}><Sparkles className="w-4 h-4 mr-2" />Sample</Button></div></div></CardContent></Card>
              ) : (
                <Card className="shadow-lg border-slate-200"><CardContent className="p-12"><div className="flex flex-col items-center justify-center text-center"><div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6"><BarChartIcon className="w-10 h-10 text-primary/60" /></div><h3 className="text-xl font-semibold text-primary mb-2">Ready to Visualize</h3><p className="text-muted-foreground max-w-md">Select a chart type, configure variables, then click <strong>Generate</strong></p></div></CardContent></Card>
              )}
            </div>
          </div>

          <footer className="bg-white border-t px-6 py-2 text-xs text-muted-foreground flex justify-between items-center">
            <span>{canRun ? `${data.length} rows × ${allLen} cols` : 'No data'}</span>
            <div className="flex items-center gap-3">
              {activeChart && <Badge variant="outline" className="text-primary">{selectedInfo?.label}</Badge>}
              {analysisResult && <Badge variant="secondary" className="text-green-600">Generated</Badge>}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

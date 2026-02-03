"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, BookOpen, FileText, Download, Settings, Activity,
  ChevronRight, DollarSign, Calendar, BarChart3, TrendingDown,
  Target, Clock, Sparkles, AlertTriangle, BookMarked, LineChart
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface ForecastResult {
  success: boolean;
  results: {
    forecast_data: Array<{
      date: string;
      forecast: number;
      lower_bound: number;
      upper_bound: number;
    }>;
    metrics: {
      total_historical_sales: number;
      avg_daily_sales: number;
      median_daily_sales: number;
      total_forecast_sales: number;
      avg_forecast_daily: number;
      growth_rate: number;
      trend_direction: string;
      confidence_score: number;
      model_used: string;
      historical_days: number;
      forecast_days: number;
    };
  };
  visualizations: {
    forecast_overview?: string;
    trend_analysis?: string;
    comparison?: string;
    confidence_intervals?: string;
    monthly_forecast?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    forecast_days: number;
    total_forecast_sales: number;
    growth_rate: number;
    confidence_score: number;
  };
}

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const startDate = new Date('2023-01-01');
  const baseSales = 1000;
  const trend = 0.5;
  
  for (let day = 0; day < 365; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);
    
    const trendValue = baseSales + (trend * day);
    const dayOfWeek = currentDate.getDay();
    const seasonalFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.3 : 1.0;
    const noise = (Math.random() - 0.5) * 200;
    const sales = Math.max(0, trendValue * seasonalFactor + noise);
    
    data.push({
      date: currentDate.toISOString().split('T')[0],
      sales: parseFloat(sales.toFixed(2))
    });
  }
  
  return data;
};

const MetricCard: React.FC<{ 
  value: string | number; 
  label: string; 
  icon?: React.FC<{ className?: string }>; 
  highlight?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ value, label, icon: Icon, highlight, trend }) => (
  <div className={`text-center p-4 rounded-lg border ${
    highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className="w-5 h-5 mx-auto mb-2 text-primary" />}
    <p className={`text-2xl font-semibold ${
      trend === 'up' ? 'text-green-600' : 
      trend === 'down' ? 'text-red-600' : 
      highlight ? 'text-primary' : ''
    }`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

const FindingBox: React.FC<{ finding: string }> = ({ finding }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Key Finding</p>
    <p className="font-medium text-foreground">{finding}</p>
  </div>
);

const DetailParagraph: React.FC<{ title?: string; detail: string }> = ({ title, detail }) => (
  <div className="mt-6 p-4 rounded-lg border border-border bg-muted/10">
    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
      {title || "Detailed Analysis"}
    </p>
    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{detail}</p>
  </div>
);

const DataPreview: React.FC<{ data: DataRow[]; columns: string[] }> = ({ data, columns }) => {
  const [expanded, setExpanded] = useState(false);
  
  const downloadCSV = () => {
    const header = columns.join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return val;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'forecast_source_data.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 hover:text-primary transition-colors"
        >
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">
            {data.length.toLocaleString()} rows × {columns.length} columns
          </Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${
            expanded ? 'rotate-90' : ''
          }`} />
        </button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={downloadCSV}>
          <Download className="w-3 h-3" />Download
        </Button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 10).map((row, i) => (
                <TableRow key={i}>
                  {columns.map(col => (
                    <TableCell key={col} className="text-xs py-1.5">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length > 10 && (
            <p className="text-xs text-muted-foreground p-2 text-center">
              Showing first 10 of {data.length.toLocaleString()} rows
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{ 
  currentStep: number; 
  hasResults: boolean; 
  onStepClick: (step: number) => void 
}> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [
    { num: 1, label: "Intro" },
    { num: 2, label: "Config" },
    { num: 3, label: "Validation" },
    { num: 4, label: "Summary" },
    { num: 5, label: "Methodology" },
    { num: 6, label: "Report" }
  ];
  
  return (
    <div className="flex items-center justify-center gap-0.5 mb-8 flex-wrap">
      {steps.map((step, idx) => {
        const isCompleted = step.num < currentStep;
        const isCurrent = step.num === currentStep;
        const isAccessible = step.num <= 3 || hasResults;
        
        return (
          <React.Fragment key={step.num}>
            <button
              onClick={() => isAccessible && onStepClick(step.num)}
              disabled={!isAccessible}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                isCurrent 
                  ? "bg-primary text-primary-foreground" 
                  : isCompleted 
                  ? "bg-primary/10 text-primary" 
                  : isAccessible 
                  ? "bg-muted text-muted-foreground hover:bg-muted/80" 
                  : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
              }`}
            >
              {step.label}
            </button>
            {idx < steps.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const StatisticalGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Sales Forecasting Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Sales Forecasting?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sales forecasting uses historical sales data to predict future sales patterns. This analysis employs time series 
              algorithms to identify trends, seasonality, and patterns, providing short-term and long-term revenue projections 
              to support business planning and decision-making.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Time Series Models Used
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Prophet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Method:</strong> Additive model decomposing time series into trend, seasonality, and holidays<br/>
                  <strong>Strengths:</strong> Handles missing data, outliers, and multiple seasonality patterns<br/>
                  <strong>Best for:</strong> Daily/weekly data with strong seasonal patterns
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Simple Trend + Seasonality (Fallback)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Method:</strong> Linear trend with exponential smoothing and weekly seasonality<br/>
                  <strong>Strengths:</strong> Fast, interpretable, works without external dependencies<br/>
                  <strong>Best for:</strong> Stable trends with regular weekly patterns
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Key Metrics Explained
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Growth Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Percentage change between recent historical average and forecast average. 
                  Positive values indicate expected growth, negative values indicate decline.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Confidence Score</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Model reliability indicator (0-100%). Higher scores indicate more reliable predictions. 
                  Based on historical forecast accuracy or R² depending on algorithm used.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Trend Direction</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Overall direction of sales movement: Increasing, Decreasing, or Stable. 
                  Determined by analyzing slope of trend component over forecast period.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Model Assumptions & Limitations
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Historical Patterns Continue:</strong> Assumes past trends persist into future</p>
              <p>• <strong>No Major Disruptions:</strong> Doesn't account for unprecedented events</p>
              <p>• <strong>Data Quality:</strong> Accuracy depends on complete, clean historical data</p>
              <p>• <strong>External Factors:</strong> Doesn't model competition, economic changes, or campaigns</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Best Practices
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Data Requirements</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Minimum 6 months historical data</li>
                  <li>• Daily or aggregated transactions</li>
                  <li>• Consistent date format</li>
                  <li>• Clean, complete records</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Forecast Usage</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use for planning, not guarantees</li>
                  <li>• Monitor actual vs forecast</li>
                  <li>• Update monthly with new data</li>
                  <li>• Combine with business judgment</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> Forecasts are probabilistic estimates 
              based on historical patterns. Actual results may vary due to market changes and unforeseen events. 
              Use forecasts as planning tools alongside business expertise. Regular model updates are essential.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const IntroPage: React.FC<{ 
  onLoadSample: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <LineChart className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Sales Forecast Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Predict future sales using advanced time series algorithms. Analyze trends, identify seasonal patterns, 
          and generate short-term and long-term revenue forecasts to support strategic planning and resource allocation.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Trend Analysis</p>
              <p className="text-xs text-muted-foreground">Long-term patterns</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Seasonality Detection</p>
              <p className="text-xs text-muted-foreground">Weekly/monthly cycles</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Revenue Projection</p>
              <p className="text-xs text-muted-foreground">Future estimates</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use Sales Forecasting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Date column (daily/weekly/monthly)",
                  "Sales/revenue column (numeric)",
                  "Minimum 6 months historical data",
                  "Consistent time intervals",
                  "Sufficient data points (100+ recommended)"
                ].map((req) => (
                  <li key={req} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Future sales predictions (30-90 days)",
                  "Trend direction (increasing/stable/decreasing)",
                  "Confidence intervals and uncertainty ranges",
                  "Growth rate projections",
                  "Seasonal pattern identification"
                ].map((res) => (
                  <li key={res} className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {res}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onLoadSample} className="gap-2">
              <Activity className="w-4 h-4" />
              Load Sample Data
            </Button>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()} 
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Your Data
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileUpload}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function SalesForecastPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const [dateCol, setDateCol] = useState<string>("");
  const [salesCol, setSalesCol] = useState<string>("");
  const [forecastDays, setForecastDays] = useState<number>(30);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setDateCol("date");
    setSalesCol("sales");
    setCurrentStep(2);
    setResults(null);
    setError(null);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      setLoading(true);
      const res = await fetch(`${FASTAPI_URL}/api/data/upload`, {
        method: "POST",
        body: formData
      });
      
      if (!res.ok) throw new Error("Upload failed");
      
      const result = await res.json();
      setData(result.data);
      setColumns(result.columns);
      setCurrentStep(2);
      setResults(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const checks: ValidationCheck[] = [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 
          ? `${data.length.toLocaleString()} observations loaded` 
          : "No data loaded"
      },
      {
        name: "Date Column",
        passed: !!dateCol,
        message: dateCol 
          ? `Using: ${dateCol}` 
          : "Select date column"
      },
      {
        name: "Sales Column",
        passed: !!salesCol,
        message: salesCol 
          ? `Using: ${salesCol}` 
          : "Select sales column"
      }
    ];
    
    if (dateCol && salesCol) {
      const uniqueDates = new Set(data.map(d => d[dateCol])).size;
      checks.push({
        name: "Sufficient Data Points",
        passed: uniqueDates >= 30,
        message: uniqueDates >= 100
          ? `${uniqueDates} data points (excellent)`
          : uniqueDates >= 30
          ? `${uniqueDates} data points (acceptable)`
          : `Only ${uniqueDates} data points (need ≥30)`
      });
      
      const dates = data.map(d => new Date(String(d[dateCol]))).sort((a, b) => a.getTime() - b.getTime());
      const daysDiff = Math.floor((dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24));
      
      checks.push({
        name: "Historical Period",
        passed: daysDiff >= 180,
        message: daysDiff >= 365
          ? `${Math.floor(daysDiff / 30)} months (excellent)`
          : daysDiff >= 180
          ? `${Math.floor(daysDiff / 30)} months (good)`
          : `Only ${Math.floor(daysDiff / 30)} months (need ≥6 months)`
      });
    }
    
    return checks;
  }, [data, dateCol, salesCol]);

  const runForecast = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        date_col: dateCol,
        sales_col: salesCol,
        forecast_days: forecastDays
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: ForecastResult = await res.json();
      setResults(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadForecast = () => {
    if (!results) return;
    const forecastData = results.results.forecast_data;
    if (!forecastData.length) return;
    
    const headers = Object.keys(forecastData[0]).join(",");
    const rows = forecastData.map(f => Object.values(f).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sales_forecast.csv";
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${base64}`;
    a.download = `forecast_${chartKey}.png`;
    a.click();
  };

  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Forecast Parameters
        </CardTitle>
        <CardDescription>Set up time series forecasting settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date Column *</Label>
            <Select value={dateCol || "__none__"} onValueChange={v => setDateCol(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select date column..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-- Select --</SelectItem>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sales/Revenue Column *</Label>
            <Select value={salesCol || "__none__"} onValueChange={v => setSalesCol(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select sales column..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-- Select --</SelectItem>
                {columns.filter(col => {
                  const sample = data[0]?.[col];
                  return typeof sample === "number" || !isNaN(Number(sample));
                }).map((col) => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Forecast Period (Days)</Label>
          <div className="flex items-center gap-4">
            <Input 
              type="number" 
              value={forecastDays} 
              onChange={(e) => setForecastDays(Math.max(7, Math.min(90, parseInt(e.target.value) || 30)))}
              min={7}
              max={90}
              className="max-w-xs"
            />
            <span className="text-sm text-muted-foreground">
              (7-90 days, default: 30)
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => setCurrentStep(3)} className="gap-2">
            Continue to Validation
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    const canRun = checks.every(c => c.passed);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Data Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {checks.map((check, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  check.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  {check.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.message}</p>
                  </div>
                </div>
                <Badge variant={check.passed ? "secondary" : "destructive"} className="text-xs">
                  {check.passed ? "Pass" : "Warning"}
                </Badge>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Configuration Summary</p>
                <p className="text-muted-foreground">
                  Date: {dateCol} • Sales: {salesCol} • Forecast: {forecastDays} days
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              Back to Config
            </Button>
            <Button onClick={runForecast} disabled={loading || !canRun} className="gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Forecasting...
                </>
              ) : (
                <>
                  Run Forecast Analysis
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep4Summary = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights } = results;
    const metrics = r.metrics;
    
    const finding = `Analysis of ${metrics.historical_days} days of historical data using ${metrics.model_used} algorithm. Forecast for next ${metrics.forecast_days} days shows ${metrics.trend_direction.toLowerCase()} trend with ${metrics.growth_rate >= 0 ? '+' : ''}${metrics.growth_rate.toFixed(1)}% growth rate. Total projected sales: $${summary.total_forecast_sales.toLocaleString()}`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Forecast Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              value={`${summary.forecast_days}d`}
              label="Forecast Period"
              icon={Calendar}
              highlight
            />
            <MetricCard
              value={`${summary.growth_rate >= 0 ? '+' : ''}${summary.growth_rate.toFixed(1)}%`}
              label="Growth Rate"
              icon={TrendingUp}
              trend={summary.growth_rate > 5 ? 'up' : summary.growth_rate < -5 ? 'down' : 'neutral'}
            />
            <MetricCard
              value={`$${(summary.total_forecast_sales / 1000).toFixed(0)}K`}
              label="Total Forecast"
              icon={DollarSign}
            />
            <MetricCard
              value={`${summary.confidence_score.toFixed(0)}%`}
              label="Confidence"
              icon={Target}
            />
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Trend Analysis</h4>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-lg p-4 border border-border bg-muted/10">
                <Clock className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-medium">Historical Period</p>
                <p className="text-2xl font-semibold">{metrics.historical_days}</p>
                <p className="text-xs text-muted-foreground">days analyzed</p>
              </div>

              <div className="rounded-lg p-4 border border-border bg-muted/10">
                <TrendingUp className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-medium">Trend Direction</p>
                <p className="text-2xl font-semibold">{metrics.trend_direction}</p>
                <p className="text-xs text-muted-foreground">forecast pattern</p>
              </div>

              <div className="rounded-lg p-4 border border-border bg-muted/10">
                <BarChart3 className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-medium">Model Used</p>
                <p className="text-lg font-semibold">{metrics.model_used}</p>
                <p className="text-xs text-muted-foreground">algorithm</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.map((insight, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  insight.status === "positive"
                    ? "border-primary/30 bg-primary/5"
                    : insight.status === "warning"
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-muted/10"
                }`}
              >
                {insight.status === "positive" ? (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                ) : insight.status === "warning" ? (
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                ) : (
                  <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">{insight.title}</p>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>

          <DetailParagraph
            title="Summary Interpretation"
            detail={`This sales forecast uses ${metrics.model_used} to analyze ${metrics.historical_days} days of historical data and project ${metrics.forecast_days} days into the future.

■ Historical Performance
• Average daily sales: $${metrics.avg_daily_sales.toFixed(2)}
• Median daily sales: $${metrics.median_daily_sales.toFixed(2)}
• Total historical sales: $${metrics.total_historical_sales.toLocaleString()}

■ Forecast Results
• Projected total sales: $${metrics.total_forecast_sales.toLocaleString()}
• Average forecast daily: $${metrics.avg_forecast_daily.toFixed(2)}
• Expected growth rate: ${metrics.growth_rate >= 0 ? '+' : ''}${metrics.growth_rate.toFixed(1)}%
• Trend direction: ${metrics.trend_direction}

■ Model Confidence: ${metrics.confidence_score.toFixed(1)}%
${metrics.confidence_score > 70 
  ? `High confidence score indicates reliable predictions. The model has strong predictive power for this dataset.`
  : metrics.confidence_score > 50
  ? `Moderate confidence. Forecasts provide reasonable estimates but should be validated against actual performance.`
  : `Lower confidence suggests high variability in historical data. Use forecasts as directional guidance rather than precise predictions.`}

■ Strategic Implications
${metrics.trend_direction === 'Increasing' 
  ? `Growing sales trajectory detected. Consider: increasing inventory levels, scaling production capacity, expanding marketing efforts, and preparing for higher demand.`
  : metrics.trend_direction === 'Decreasing'
  ? `Declining sales pattern identified. Recommended actions: launch promotional campaigns, review pricing strategy, investigate competitive threats, and enhance product/service quality.`
  : `Stable sales pattern observed. Focus on: operational efficiency improvements, maintaining current resource levels, customer retention programs, and exploring new revenue streams.`}`}
          />

          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">
              Understand Methodology
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Methodology = () => {
    if (!results) return null;

    const explanations = [
      {
        num: 1,
        title: "Time Series Decomposition",
        content: "Breaks down sales data into trend (long-term direction), seasonality (recurring patterns), and residual components. This decomposition helps identify underlying patterns that drive sales performance."
      },
      {
        num: 2,
        title: "Trend Analysis",
        content: `Uses ${results.results.metrics.model_used} to capture long-term sales movement. Trend indicates overall business trajectory independent of seasonal fluctuations or random noise.`
      },
      {
        num: 3,
        title: "Seasonality Detection",
        content: "Identifies recurring patterns (weekly, monthly, yearly cycles). For example, weekend sales spikes or holiday season increases. These patterns are projected forward in the forecast."
      },
      {
        num: 4,
        title: "Confidence Intervals",
        content: `Forecast includes upper and lower bounds showing uncertainty range. Model confidence of ${results.summary.confidence_score.toFixed(1)}% reflects historical prediction accuracy. Wider intervals indicate higher uncertainty.`
      }
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-primary" />
            Understanding the Methodology
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Sales forecasting employs time series analysis to project future sales based on historical patterns. This methodology decomposes data into trend and seasonal components for accurate predictions." />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Analysis Components</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {explanations.map((exp) => (
                <div key={exp.num} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                      {exp.num}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{exp.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {exp.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Strategic Framework by Trend</h4>
            <div className="space-y-3">
              {[
                {
                  type: "Increasing Trend",
                  indicator: "Upward sales trajectory",
                  actions: ["Increase inventory levels", "Scale production capacity", "Expand marketing budget", "Hire additional staff"],
                  reasoning: "Growing sales momentum requires proactive resource scaling to meet rising demand and maintain service levels."
                },
                {
                  type: "Decreasing Trend",
                  indicator: "Downward sales trajectory",
                  actions: ["Launch promotional campaigns", "Review pricing strategy", "Investigate competitive threats", "Improve product quality"],
                  reasoning: "Declining sales require intervention to reverse negative momentum through marketing, pricing adjustments, and quality improvements."
                },
                {
                  type: "Stable Trend",
                  indicator: "Consistent sales performance",
                  actions: ["Focus on efficiency", "Maintain current resources", "Invest in retention", "Explore new revenue streams"],
                  reasoning: "Stable patterns allow focus on operational excellence, customer loyalty, and strategic growth initiatives without capacity concerns."
                }
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="mb-2">
                    <p className="font-medium">{item.type}</p>
                    <p className="text-xs text-muted-foreground">{item.reasoning}</p>
                  </div>
                  <p className="text-xs font-medium text-primary mb-2">Recommended Actions:</p>
                  <div className="flex flex-wrap gap-1">
                    {item.actions.map(action => (
                      <Badge key={action} variant="outline" className="text-xs">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DetailParagraph
            title="Implementation Roadmap"
            detail={`Step-by-step guide for implementing forecast-driven strategies.

■ Week 1-2: Data Foundation
• Collect 6-12 months of historical sales data
• Clean data (handle outliers, fill missing dates)
• Validate data quality and completeness
• Run initial forecast analysis

■ Week 3-4: Strategic Planning
• Review forecast results and confidence intervals
• Identify resource allocation needs
• Develop scenario plans (conservative/expected/optimistic)
• Prepare budget adjustments

■ Month 2-3: Execution
• Implement inventory/staffing changes based on forecast
• Launch marketing campaigns aligned with projected trends
• Adjust pricing or promotions as recommended
• Monitor actual vs forecast performance daily

■ Month 4+: Continuous Improvement
• Compare actual results to forecasts
• Calculate forecast accuracy metrics
• Re-run analysis monthly with updated data
• Refine strategies based on performance
• Document learnings and best practices

■ Key Success Metrics
• Forecast accuracy (MAPE, RMSE)
• Inventory turnover improvements
• Stockout reduction
• Resource utilization efficiency
• Revenue growth vs forecast

■ Common Pitfalls to Avoid
• Over-reliance on point estimates (use confidence intervals)
• Ignoring external factors (marketing campaigns, competition)
• Infrequent updates (refresh monthly minimum)
• Not validating against actual performance
• Treating forecasts as guarantees rather than estimates`}
          />

          <Card className="border-border bg-muted/10">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm mb-2">Disclaimer</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This report is a decision-making support tool derived from statistical algorithms. 
                    Forecasts are probabilistic estimates based on historical patterns; actual results 
                    may vary due to market changes, competitive actions, and unforeseen events. 
                    This information does not guarantee specific outcomes, and the final responsibility 
                    for any decisions rests solely with the user.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>
              Back to Summary
            </Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">
              View Full Report
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => {
    if (!results) return null;

    const { summary, results: r, key_insights, visualizations } = results;
    const forecastData = r.forecast_data.slice(0, 20);

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Sales Forecast Analysis Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Time Series Prediction & Trend Analysis | {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={`${summary.forecast_days}d`} label="Forecast Period" highlight />
              <MetricCard value={`${summary.growth_rate >= 0 ? '+' : ''}${summary.growth_rate.toFixed(1)}%`} label="Growth Rate" />
              <MetricCard value={`$${(summary.total_forecast_sales / 1000).toFixed(0)}K`} label="Total Forecast" />
              <MetricCard value={`${summary.confidence_score.toFixed(0)}%`} label="Confidence" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Time series analysis performed on {r.metrics.historical_days} days of historical data using {r.metrics.model_used} algorithm. 
              Forecast for next {summary.forecast_days} days shows {r.metrics.trend_direction.toLowerCase()} trend with {summary.growth_rate >= 0 ? '+' : ''}{summary.growth_rate.toFixed(1)}% 
              expected growth. Total projected sales: ${summary.total_forecast_sales.toLocaleString()}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {key_insights.map((ins, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  ins.status === "warning"
                    ? "border-destructive/30 bg-destructive/5"
                    : ins.status === "positive"
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/10"
                }`}
              >
                {ins.status === "warning" ? (
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                ) : ins.status === "positive" ? (
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
                )}
                <div>
                  <p className="font-medium text-sm">{ins.title}</p>
                  <p className="text-sm text-muted-foreground">{ins.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Visualizations</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
              <TabsList className="mb-4 flex-wrap">
                {visualizations.forecast_overview && <TabsTrigger value="forecast_overview" className="text-xs">Forecast Overview</TabsTrigger>}
                {visualizations.trend_analysis && <TabsTrigger value="trend_analysis" className="text-xs">Trend</TabsTrigger>}
                {visualizations.comparison && <TabsTrigger value="comparison" className="text-xs">Comparison</TabsTrigger>}
                {visualizations.confidence_intervals && <TabsTrigger value="confidence_intervals" className="text-xs">Confidence Intervals</TabsTrigger>}
                {visualizations.monthly_forecast && <TabsTrigger value="monthly_forecast" className="text-xs">Monthly</TabsTrigger>}
              </TabsList>
              {Object.entries(visualizations).map(([key, value]) =>
                value && (
                  <TabsContent key={key} value={key}>
                    <div className="relative border border-border rounded-lg overflow-hidden">
                      <img src={`data:image/png;base64,${value}`} alt={key} className="w-full" />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => handleDownloadPNG(key)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TabsContent>
                )
              )}
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Forecast Data (First 20 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Forecast</TableHead>
                  <TableHead className="text-right">Lower Bound</TableHead>
                  <TableHead className="text-right">Upper Bound</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecastData.map((f, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{f.date}</TableCell>
                    <TableCell className="text-right">${f.forecast.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">${f.lower_bound.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">${f.upper_bound.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              Disclaimer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This report is a decision-making support tool derived from statistical algorithms. 
                Forecasts are probabilistic estimates based on historical patterns; actual results 
                may vary due to market changes, competitive actions, and unforeseen events. 
                This information does not guarantee specific outcomes, and the final responsibility 
                for any decisions rests solely with the user.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadForecast} className="gap-2">
                <FileText className="w-4 h-4" />
                CSV (Forecast Data)
              </Button>
              {Object.entries(visualizations).map(([key, value]) =>
                value && (
                  <Button
                    key={key}
                    variant="outline"
                    onClick={() => handleDownloadPNG(key)}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {key.replace(/_/g, ' ')}
                  </Button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(5)}>
            Back
          </Button>
          <Button variant="outline" onClick={() => setCurrentStep(1)}>
            New Analysis
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {currentStep > 1 && (
        <div className="flex justify-end mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowGuide(true)} 
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Guide
          </Button>
        </div>
      )}
      
      <StatisticalGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
      
      {currentStep > 1 && <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />}
      {currentStep > 1 && data.length > 0 && <DataPreview data={data} columns={columns} />}
      
      {currentStep === 1 && <IntroPage onLoadSample={handleLoadSample} onFileUpload={handleFileUpload} />}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Methodology()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}
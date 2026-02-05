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
  Target, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  BarChart3, Play, DollarSign, Users, MousePointer,
  TrendingDown, Percent, ArrowUpRight, ArrowDownRight,
  Eye, ShoppingCart, Zap, Calendar, Globe,
  Smartphone, Monitor, Layers, Filter, Clock,
  PieChart, LineChart, GitBranch, MapPin
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface SegmentMetrics {
  segment: string;
  segment_value: string;
  visitors: number;
  conversions: number;
  conversion_rate: number;
  revenue: number;
  avg_order_value: number;
  rate_vs_avg: number;
}

interface FunnelStep {
  step: string;
  visitors: number;
  drop_rate: number;
  cumulative_rate: number;
}

interface TimeTrend {
  period: string;
  visitors: number;
  conversions: number;
  conversion_rate: number;
}

interface ConversionResult {
  success: boolean;
  results: {
    summary: {
      total_visitors: number;
      total_conversions: number;
      overall_rate: number;
      total_revenue: number;
      avg_order_value: number;
      best_segment: string;
      worst_segment: string;
    };
    segment_analysis: SegmentMetrics[];
    funnel_analysis: FunnelStep[];
    time_trends: TimeTrend[];
    statistical_tests: {
      segment: string;
      segment_value: string;
      z_score: number;
      p_value: number;
      significant: boolean;
      ci_lower: number;
      ci_upper: number;
    }[];
    recommendations: {
      priority: string;
      category: string;
      recommendation: string;
      impact: string;
    }[];
  };
  visualizations: {
    segment_comparison?: string;
    funnel_chart?: string;
    time_trend?: string;
    rate_distribution?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_date: string;
    segments_analyzed: number;
    solve_time_ms: number;
  };
}

// ============ CONSTANTS ============
const COMMON_SEGMENTS = [
  { value: "device", label: "Device Type", icon: Smartphone },
  { value: "source", label: "Traffic Source", icon: Globe },
  { value: "campaign", label: "Campaign", icon: Target },
  { value: "location", label: "Location", icon: MapPin },
  { value: "landing_page", label: "Landing Page", icon: Layers },
  { value: "user_type", label: "New vs Returning", icon: Users },
];

const BENCHMARK_RATES = [
  { industry: "E-commerce", rate: "2.5-3.5%" },
  { industry: "SaaS", rate: "3-5%" },
  { industry: "B2B", rate: "2-4%" },
  { industry: "Finance", rate: "5-10%" },
  { industry: "Travel", rate: "2-4%" },
  { industry: "Media", rate: "10-15%" },
];

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  const devices = ['Desktop', 'Mobile', 'Tablet'];
  const sources = ['Organic', 'Paid Search', 'Social', 'Email', 'Direct', 'Referral'];
  const campaigns = ['Summer Sale', 'Brand Awareness', 'Retargeting', 'New Product', 'Holiday'];
  const landingPages = ['/home', '/product', '/pricing', '/signup', '/promo'];
  const userTypes = ['New', 'Returning'];
  const countries = ['US', 'UK', 'DE', 'FR', 'CA', 'AU'];
  
  const data: DataRow[] = [];
  const startDate = new Date('2024-01-01');
  
  // Device-specific conversion rates
  const deviceRates: { [key: string]: number } = { 'Desktop': 0.035, 'Mobile': 0.020, 'Tablet': 0.028 };
  const sourceRates: { [key: string]: number } = { 'Email': 0.045, 'Organic': 0.030, 'Paid Search': 0.035, 'Direct': 0.040, 'Social': 0.015, 'Referral': 0.025 };
  
  for (let i = 0; i < 5000; i++) {
    const device = devices[Math.floor(Math.random() * devices.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const campaign = campaigns[Math.floor(Math.random() * campaigns.length)];
    const landingPage = landingPages[Math.floor(Math.random() * landingPages.length)];
    const userType = userTypes[Math.floor(Math.random() * userTypes.length)];
    const country = countries[Math.floor(Math.random() * countries.length)];
    
    // Calculate conversion probability
    let baseRate = (deviceRates[device] + sourceRates[source]) / 2;
    if (userType === 'Returning') baseRate *= 1.5;
    if (landingPage === '/promo') baseRate *= 1.3;
    if (landingPage === '/signup') baseRate *= 1.2;
    
    const converted = Math.random() < baseRate ? 1 : 0;
    const revenue = converted ? Math.floor(Math.random() * 200) + 30 : 0;
    
    // Random date
    const visitDate = new Date(startDate);
    visitDate.setDate(visitDate.getDate() + Math.floor(Math.random() * 180));
    
    // Funnel steps
    const viewedProduct = Math.random() < 0.6 ? 1 : 0;
    const addedToCart = viewedProduct && Math.random() < 0.4 ? 1 : 0;
    const startedCheckout = addedToCart && Math.random() < 0.6 ? 1 : 0;
    const completed = startedCheckout && Math.random() < 0.5 ? 1 : 0;
    
    data.push({
      visitor_id: `V-${String(i + 1).padStart(6, '0')}`,
      visit_date: visitDate.toISOString().split('T')[0],
      device,
      traffic_source: source,
      campaign: source === 'Paid Search' || source === 'Social' ? campaign : null,
      landing_page: landingPage,
      user_type: userType,
      country,
      page_views: Math.floor(Math.random() * 10) + 1,
      session_duration: Math.floor(Math.random() * 600) + 30,
      viewed_product: viewedProduct,
      added_to_cart: addedToCart,
      started_checkout: startedCheckout,
      converted: completed || converted,
      revenue: completed ? revenue : (converted ? revenue : 0),
    });
  }
  
  return data;
};

// ============ UTILITY COMPONENTS ============
const MetricCard: React.FC<{ 
  value: string | number; 
  label: string; 
  sublabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  negative?: boolean; 
  highlight?: boolean; 
  icon?: React.FC<{ className?: string }> 
}> = ({ value, label, sublabel, trend, negative, highlight, icon: Icon }) => (
  <div className={`text-center p-4 rounded-lg border ${
    negative ? 'border-destructive/30 bg-destructive/5' : 
    highlight ? 'border-primary/30 bg-primary/5' : 
    'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-primary' : negative ? 'text-destructive' : 'text-muted-foreground'}`} />}
    <div className="flex items-center justify-center gap-1">
      <p className={`text-2xl font-semibold ${negative ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
      {trend && (
        trend === 'up' ? <ArrowUpRight className="w-4 h-4 text-green-500" /> :
        trend === 'down' ? <ArrowDownRight className="w-4 h-4 text-red-500" /> : null
      )}
    </div>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
    {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
  </div>
);

const FindingBox: React.FC<{ finding: string }> = ({ finding }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Key Finding</p>
    <p className="font-medium text-foreground">{finding}</p>
  </div>
);

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
    { num: 5, label: "Why" },
    { num: 6, label: "Report" },
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
                isCurrent ? "bg-primary text-primary-foreground" :
                isCompleted ? "bg-primary/10 text-primary" :
                isAccessible ? "bg-muted text-muted-foreground hover:bg-muted/80" :
                "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
              }`}
            >
              {step.label}
            </button>
            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const RateBadge: React.FC<{ rate: number; benchmark?: number }> = ({ rate, benchmark = 3 }) => {
  const color = rate >= benchmark * 1.2 ? 'bg-green-100 text-green-700' :
                rate >= benchmark ? 'bg-blue-100 text-blue-700' :
                rate >= benchmark * 0.7 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700';
  return <Badge className={`${color} text-xs font-mono`}>{rate.toFixed(2)}%</Badge>;
};

const SignificanceBadge: React.FC<{ significant: boolean; pValue: number }> = ({ significant, pValue }) => {
  if (significant) {
    return <Badge className="bg-green-100 text-green-700 text-xs">Significant (p={pValue.toFixed(3)})</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">Not Significant</Badge>;
};

const formatNumber = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const formatPercent = (value: number): string => `${value.toFixed(2)}%`;
// ============ INTRO PAGE ============
const IntroPage: React.FC<{ 
  onLoadSample: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Conversion Rate Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Analyze conversion rates across segments, identify optimization opportunities,
          and understand your conversion funnel with statistical significance testing.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
  <div className="p-5 rounded-lg border border-border bg-muted/10">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <BarChart3 className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="font-medium">Segment Analysis</p>
        <p className="text-xs text-muted-foreground">Multi-dimensional breakdown</p>
      </div>
    </div>
  </div>

    <div className="p-5 rounded-lg border border-border bg-muted/10">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">Funnel Tracking</p>
          <p className="text-xs text-muted-foreground">Drop-off identification</p>
        </div>
      </div>
    </div>

    <div className="p-5 rounded-lg border border-border bg-muted/10">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">Statistical Testing</p>
          <p className="text-xs text-muted-foreground">Significance validation</p>
        </div>
      </div>
    </div>
  </div>




      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            About Conversion Rate Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">What You'll Learn</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Overall and segment-level conversion rates",
                  "Statistical significance of segment differences",
                  "Funnel drop-off analysis",
                  "Time trend patterns",
                  "Optimization recommendations",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Required Data</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Visitor ID (unique identifier)",
                  "Converted (0/1 flag)",
                  "Segment columns (optional)",
                  "Revenue (optional)",
                  "Funnel steps (optional)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {item}
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
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Data
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

// ============ MAIN COMPONENT ============
export default function ConversionRateAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Configuration
  const [visitorIdCol, setVisitorIdCol] = useState<string>("");
  const [convertedCol, setConvertedCol] = useState<string>("");
  const [revenueCol, setRevenueCol] = useState<string>("");
  const [dateCol, setDateCol] = useState<string>("");
  const [segmentCols, setSegmentCols] = useState<string[]>([]);
  const [funnelCols, setFunnelCols] = useState<string[]>([]);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    
    // Auto-configure
    setVisitorIdCol("visitor_id");
    setConvertedCol("converted");
    setRevenueCol("revenue");
    setDateCol("visit_date");
    setSegmentCols(["device", "traffic_source", "landing_page", "user_type"]);
    setFunnelCols(["viewed_product", "added_to_cart", "started_checkout", "converted"]);
    
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
      const res = await fetch(`${FASTAPI_URL}/api/data/upload`, { method: "POST", body: formData });
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

  const toggleSegmentCol = (col: string) => {
    setSegmentCols(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const toggleFunnelCol = (col: string) => {
    setFunnelCols(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    return [
      { name: "Data Loaded", passed: data.length > 0, message: data.length > 0 ? `${data.length} visitors loaded` : "No data" },
      { name: "Visitor ID", passed: !!visitorIdCol, message: visitorIdCol ? `Using: ${visitorIdCol}` : "Select visitor ID column" },
      { name: "Conversion Flag", passed: !!convertedCol, message: convertedCol ? `Using: ${convertedCol}` : "Select conversion column" },
      { name: "Segments Selected", passed: segmentCols.length > 0, message: segmentCols.length > 0 ? `${segmentCols.length} segments` : "Select at least 1 segment" },
    ];
  }, [data, visitorIdCol, convertedCol, segmentCols]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        visitor_id_col: visitorIdCol,
        converted_col: convertedCol,
        revenue_col: revenueCol || null,
        date_col: dateCol || null,
        segment_cols: segmentCols,
        funnel_cols: funnelCols.length > 0 ? funnelCols : null,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/conversion-rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: ConversionResult = await res.json();
      setResults(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!results) return;
    const rows: string[] = ['Segment,Value,Visitors,Conversions,Rate,Revenue,AOV,vs Avg'];
    results.results.segment_analysis.forEach(s => {
      rows.push(`${s.segment},${s.segment_value},${s.visitors},${s.conversions},${s.conversion_rate.toFixed(2)}%,${s.revenue},${s.avg_order_value.toFixed(2)},${s.rate_vs_avg >= 0 ? '+' : ''}${s.rate_vs_avg.toFixed(1)}%`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'conversion_analysis.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `conversion_${chartKey}.png`;
    a.click();
  };

  // ============ STEP 2: CONFIG ============
  const renderStep2Config = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5 text-primary" />
            Analysis Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Required Columns */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Required Columns
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Visitor ID *</Label>
                <Select value={visitorIdCol || "__none__"} onValueChange={v => setVisitorIdCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Select --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Converted (0/1) *</Label>
                <Select value={convertedCol || "__none__"} onValueChange={v => setConvertedCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Select --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Revenue (Optional)</Label>
                <Select value={revenueCol || "__none__"} onValueChange={v => setRevenueCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date (Optional)</Label>
                <Select value={dateCol || "__none__"} onValueChange={v => setDateCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Segment Columns */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Segment Columns (select multiple)
            </h4>
            <div className="flex flex-wrap gap-2">
              {columns.filter(c => c !== visitorIdCol && c !== convertedCol && c !== revenueCol && c !== dateCol).map(col => (
                <Badge
                  key={col}
                  variant={segmentCols.includes(col) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleSegmentCol(col)}
                >
                  {col}
                </Badge>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Funnel Columns */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" />
              Funnel Steps (optional, in order)
            </h4>
            <div className="flex flex-wrap gap-2">
              {columns.filter(c => c !== visitorIdCol && c !== revenueCol && c !== dateCol).map(col => (
                <Badge
                  key={col}
                  variant={funnelCols.includes(col) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleFunnelCol(col)}
                >
                  {funnelCols.includes(col) && `${funnelCols.indexOf(col) + 1}. `}{col}
                </Badge>
              ))}
            </div>
            {funnelCols.length > 0 && (
              <p className="text-xs text-muted-foreground">Order: {funnelCols.join(' → ')}</p>
            )}
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
  };

  // ============ STEP 3: VALIDATION ============
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
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                check.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'
              }`}>
                <div className="flex items-center gap-3">
                  {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
                  <div>
                    <p className="font-medium text-sm">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.message}</p>
                  </div>
                </div>
                <Badge variant={check.passed ? "secondary" : "destructive"} className="text-xs">
                  {check.passed ? "Pass" : "Required"}
                </Badge>
              </div>
            ))}
          </div>
          
          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>Back to Config</Button>
            <Button onClick={runAnalysis} disabled={loading || !canRun} className="gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
  // ============ STEP 4: OVERVIEW ============
  const renderStep4Summary = () => {
    if (!results) return null;
    
    const { summary: s, results: r, key_insights } = results;
    
    const finding = `Overall conversion rate: ${r.summary.overall_rate.toFixed(2)}% from ${formatNumber(r.summary.total_visitors)} visitors. ` +
      `Best performing segment: ${r.summary.best_segment}. Total revenue: ${formatCurrency(r.summary.total_revenue)}.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Conversion Rate Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={formatNumber(r.summary.total_visitors)}
              label="Total Visitors" 
              icon={Users}
            />
            <MetricCard 
              value={formatNumber(r.summary.total_conversions)}
              label="Conversions" 
              icon={Target}
            />
            <MetricCard 
              value={`${r.summary.overall_rate.toFixed(2)}%`}
              label="Conversion Rate" 
              icon={Percent}
              highlight
            />
            <MetricCard 
              value={formatCurrency(r.summary.avg_order_value)}
              label="Avg Order Value" 
              icon={DollarSign}
            />
          </div>
          
          {/* Funnel Analysis */}
          {r.funnel_analysis.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                Conversion Funnel
              </h4>
              <div className="space-y-2">
                {r.funnel_analysis.map((step, idx) => (
                  <div key={step.step} className="flex items-center gap-3">
                    <div className="w-20 text-right text-sm font-medium truncate">{step.step}</div>
                    <div className="flex-1">
                      <div className="h-8 bg-muted rounded-lg overflow-hidden relative">
                        <div 
                          className="h-full bg-primary/80 rounded-lg"
                          style={{ width: `${step.cumulative_rate}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-3 text-xs">
                          <span className="font-medium">{formatNumber(step.visitors)}</span>
                          <span className="text-muted-foreground">{step.cumulative_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    {idx > 0 && (
                      <div className="w-20 text-sm text-destructive">
                        -{step.drop_rate.toFixed(1)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Top Segments */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Top Performing Segments
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segment</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="text-right">Visitors</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">vs Avg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.segment_analysis.slice(0, 10).map((seg, idx) => (
                  <TableRow key={`${seg.segment}-${seg.segment_value}`}>
                    <TableCell className="font-medium">{seg.segment}</TableCell>
                    <TableCell>{seg.segment_value}</TableCell>
                    <TableCell className="text-right">{formatNumber(seg.visitors)}</TableCell>
                    <TableCell className="text-right">{formatNumber(seg.conversions)}</TableCell>
                    <TableCell className="text-right">
                      <RateBadge rate={seg.conversion_rate} benchmark={r.summary.overall_rate} />
                    </TableCell>
                    <TableCell className={`text-right ${seg.rate_vs_avg >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {seg.rate_vs_avg >= 0 ? '+' : ''}{seg.rate_vs_avg.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Key Insights */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.slice(0, 4).map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
                insight.status === "positive" ? "border-primary/30 bg-primary/5" :
                insight.status === "warning" ? "border-destructive/30 bg-destructive/5" :
                "border-border bg-muted/10"
              }`}>
                {insight.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> :
                 insight.status === "warning" ? <AlertCircle className="w-5 h-5 text-destructive shrink-0" /> :
                 <Info className="w-5 h-5 text-muted-foreground shrink-0" />}
                <div>
                  <p className="font-medium text-sm">{insight.title}</p>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">
              View Detailed Segments
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 5: SEGMENTS ============
  const renderStep5Why = () => {
    if (!results) return null;
    
    const { results: r } = results;
    
    // Group by segment type
    const segmentGroups: { [key: string]: typeof r.segment_analysis } = {};
    r.segment_analysis.forEach(seg => {
      if (!segmentGroups[seg.segment]) segmentGroups[seg.segment] = [];
      segmentGroups[seg.segment].push(seg);
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5 text-primary" />
            Segment Deep Dive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={`Analyzed ${Object.keys(segmentGroups).length} segment dimensions. Best: ${r.summary.best_segment}, Worst: ${r.summary.worst_segment}.`} />
          
          {/* Segment Tabs */}
          <Tabs defaultValue={Object.keys(segmentGroups)[0]}>
            <TabsList className="flex-wrap">
              {Object.keys(segmentGroups).map(seg => (
                <TabsTrigger key={seg} value={seg} className="text-xs">{seg}</TabsTrigger>
              ))}
            </TabsList>
            
            {Object.entries(segmentGroups).map(([segName, segments]) => (
              <TabsContent key={segName} value={segName} className="space-y-4">
                {/* Segment comparison bars */}
                <div className="space-y-3">
                  {segments.sort((a, b) => b.conversion_rate - a.conversion_rate).map(seg => (
                    <div key={seg.segment_value} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{seg.segment_value}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{formatNumber(seg.visitors)} visitors</span>
                          <RateBadge rate={seg.conversion_rate} benchmark={r.summary.overall_rate} />
                        </div>
                      </div>
                      <div className="h-6 bg-muted rounded-full overflow-hidden relative">
                        <div 
                          className={`h-full rounded-full ${seg.rate_vs_avg >= 0 ? 'bg-green-500' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(100, (seg.conversion_rate / Math.max(...segments.map(s => s.conversion_rate))) * 100)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center px-3">
                          <span className="text-xs font-medium text-white drop-shadow">
                            {seg.conversion_rate.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Statistical significance */}
                <div className="mt-6">
                  <h5 className="font-medium text-sm mb-3">Statistical Significance</h5>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Value</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">95% CI</TableHead>
                        <TableHead className="text-right">Z-Score</TableHead>
                        <TableHead>Significance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.statistical_tests.filter(t => t.segment === segName).map(test => (
                        <TableRow key={test.segment_value}>
                          <TableCell className="font-medium">{test.segment_value}</TableCell>
                          <TableCell className="text-right">
                            {segments.find(s => s.segment_value === test.segment_value)?.conversion_rate.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            [{test.ci_lower.toFixed(2)}%, {test.ci_upper.toFixed(2)}%]
                          </TableCell>
                          <TableCell className={`text-right font-mono ${Math.abs(test.z_score) > 1.96 ? 'text-primary' : ''}`}>
                            {test.z_score.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <SignificanceBadge significant={test.significant} pValue={test.p_value} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
          
          {/* Recommendations */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Optimization Recommendations
            </h4>
            <div className="space-y-2">
              {r.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Badge variant={rec.priority === 'High' ? 'destructive' : rec.priority === 'Medium' ? 'default' : 'secondary'} className="text-xs shrink-0">
                    {rec.priority}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{rec.recommendation}</p>
                    <p className="text-xs text-muted-foreground">{rec.category} | Impact: {rec.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Overview</Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">
              View Full Report
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 6: REPORT ============
  const renderStep6Report = () => {
    if (!results) return null;
    
    const { summary: s, results: r, visualizations } = results;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Conversion Rate Analysis Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatNumber(r.summary.total_visitors)} Visitors | {s.analysis_date}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={`${r.summary.overall_rate.toFixed(2)}%`} label="Conversion Rate" />
              <MetricCard value={formatNumber(r.summary.total_conversions)} label="Conversions" />
              <MetricCard value={formatCurrency(r.summary.total_revenue)} label="Revenue" />
              <MetricCard value={formatCurrency(r.summary.avg_order_value)} label="AOV" />
            </div>
            <p className="text-sm text-muted-foreground">
              Analyzed {s.segments_analyzed} segment combinations across {formatNumber(r.summary.total_visitors)} visitors.
              Best performing segment: {r.summary.best_segment}.
              {r.summary.overall_rate >= 3 ? ' Conversion rate is above industry average.' : ' Consider optimization strategies to improve conversion.'}
            </p>
          </CardContent>
        </Card>
        
        {/* Visualizations */}
        {visualizations && Object.keys(visualizations).some(k => visualizations[k as keyof typeof visualizations]) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Visualizations</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
                <TabsList className="mb-4 flex-wrap">
                  {visualizations.segment_comparison && <TabsTrigger value="segment_comparison" className="text-xs">Segment Comparison</TabsTrigger>}
                  {visualizations.funnel_chart && <TabsTrigger value="funnel_chart" className="text-xs">Funnel</TabsTrigger>}
                  {visualizations.rate_distribution && <TabsTrigger value="rate_distribution" className="text-xs">Rate Distribution</TabsTrigger>}
                  {visualizations.time_trend && <TabsTrigger value="time_trend" className="text-xs">Time Trend</TabsTrigger>}
                </TabsList>
                {Object.entries(visualizations).map(([key, value]) => value && (
                  <TabsContent key={key} value={key}>
                    <div className="relative border border-border rounded-lg overflow-hidden">
                      <img src={`data:image/png;base64,${value}`} alt={key} className="w-full" />
                      <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(key)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}
        
        {/* Export */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                CSV (Segment Analysis)
              </Button>
              {Object.entries(visualizations || {}).map(([key, value]) => value && (
                <Button key={key} variant="outline" onClick={() => handleDownloadPNG(key)} className="gap-2">
                  <Download className="w-4 h-4" />
                  {key.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(5)}>Back</Button>
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Analysis</Button>
        </div>
      </div>
    );
  };

  // ============ RENDER ============
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {currentStep > 1 && (
        <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />
      )}
      
      {currentStep === 1 && (
        <IntroPage 
          onLoadSample={handleLoadSample} 
          onFileUpload={handleFileUpload} 
        />
      )}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}
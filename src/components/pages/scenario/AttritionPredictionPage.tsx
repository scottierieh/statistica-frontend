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
  Share2, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Target, BarChart3, Play, MousePointer, Eye, ShoppingCart,
  Megaphone, Mail, Search, Globe, Smartphone, Monitor,
  ArrowRightLeft, Percent, DollarSign, Users
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface ChannelAttribution {
  channel: string;
  first_touch: number;
  last_touch: number;
  linear: number;
  time_decay: number;
  position_based: number;
  markov: number;
  shapley?: number;
  conversions: number;
  total_value: number;
  avg_position: number;
  touchpoints: number;
}

interface ModelComparison {
  channel: string;
  models: { [model: string]: number };
  variance: number;
}

interface PathAnalysis {
  path: string;
  conversions: number;
  conversion_rate: number;
  avg_value: number;
  total_value: number;
}

interface AttributionResult {
  success: boolean;
  results: {
    summary: {
      total_conversions: number;
      total_value: number;
      total_touchpoints: number;
      unique_channels: number;
      avg_path_length: number;
      conversion_rate: number;
    };
    channel_attribution: ChannelAttribution[];
    model_comparison: ModelComparison[];
    top_paths: PathAnalysis[];
    channel_interactions: { from: string; to: string; count: number; conversion_rate: number }[];
    transition_matrix?: { [from: string]: { [to: string]: number } };
  };
  visualizations: {
    attribution_comparison?: string;
    channel_contribution?: string;
    conversion_funnel?: string;
    path_sunburst?: string;
    transition_heatmap?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    best_first_touch: string;
    best_last_touch: string;
    most_assisted: string;
    avg_path_length: number;
    solve_time_ms: number;
  };
}

// ============ CONSTANTS ============
const ATTRIBUTION_MODELS = [
  { value: "all", label: "Compare All Models", desc: "Run all attribution models", icon: BarChart3 },
  { value: "first_touch", label: "First Touch", desc: "100% credit to first interaction", icon: MousePointer },
  { value: "last_touch", label: "Last Touch", desc: "100% credit to last interaction", icon: ShoppingCart },
  { value: "linear", label: "Linear", desc: "Equal credit to all touchpoints", icon: ArrowRightLeft },
  { value: "time_decay", label: "Time Decay", desc: "More credit to recent touchpoints", icon: TrendingUp },
  { value: "position_based", label: "Position Based", desc: "40% first, 40% last, 20% middle", icon: Target },
];

const CHANNEL_ICONS: { [key: string]: React.FC<{ className?: string }> } = {
  'Paid Search': Search,
  'Organic Search': Search,
  'Social': Share2,
  'Email': Mail,
  'Display': Monitor,
  'Direct': Globe,
  'Referral': Users,
  'Affiliate': Megaphone,
  'Mobile': Smartphone,
};

const CHANNEL_COLORS: { [key: string]: string } = {
  'Paid Search': '#4285f4',
  'Organic Search': '#34a853',
  'Social': '#e91e63',
  'Email': '#ff9800',
  'Display': '#9c27b0',
  'Direct': '#607d8b',
  'Referral': '#00bcd4',
  'Affiliate': '#795548',
  'Mobile': '#3f51b5',
};

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const channels = ['Paid Search', 'Organic Search', 'Social', 'Email', 'Display', 'Direct', 'Referral'];
  
  // Generate customer journeys
  for (let journeyId = 1; journeyId <= 2000; journeyId++) {
    const numTouchpoints = Math.floor(Math.random() * 6) + 1; // 1-6 touchpoints
    const converted = Math.random() < 0.15; // 15% conversion rate
    const conversionValue = converted ? Math.floor(Math.random() * 500) + 50 : 0;
    
    const baseDate = new Date(2024, 0, 1);
    let currentDate = new Date(baseDate);
    currentDate.setDate(currentDate.getDate() + Math.floor(Math.random() * 300));
    
    const usedChannels: string[] = [];
    
    for (let touchpoint = 1; touchpoint <= numTouchpoints; touchpoint++) {
      // Channel selection with realistic patterns
      let channel: string;
      if (touchpoint === 1) {
        // First touch often from awareness channels
        const firstChannels = ['Paid Search', 'Social', 'Display', 'Organic Search'];
        channel = firstChannels[Math.floor(Math.random() * firstChannels.length)];
      } else if (touchpoint === numTouchpoints && converted) {
        // Last touch before conversion often direct or email
        const lastChannels = ['Direct', 'Email', 'Paid Search', 'Organic Search'];
        channel = lastChannels[Math.floor(Math.random() * lastChannels.length)];
      } else {
        channel = channels[Math.floor(Math.random() * channels.length)];
      }
      
      usedChannels.push(channel);
      
      // Add time between touchpoints
      const daysBetween = Math.floor(Math.random() * 7) + 1;
      currentDate.setDate(currentDate.getDate() + daysBetween);
      
      data.push({
        journey_id: `J-${String(journeyId).padStart(5, '0')}`,
        touchpoint_order: touchpoint,
        channel: channel,
        timestamp: currentDate.toISOString().slice(0, 19).replace('T', ' '),
        converted: touchpoint === numTouchpoints ? (converted ? 1 : 0) : 0,
        conversion_value: touchpoint === numTouchpoints ? conversionValue : 0,
        campaign: `Campaign_${channel.replace(' ', '_')}_${Math.floor(Math.random() * 5) + 1}`,
      });
    }
  }
  
  return data;
};

// ============ UTILITY COMPONENTS ============
const MetricCard: React.FC<{ 
  value: string | number; 
  label: string; 
  negative?: boolean; 
  highlight?: boolean; 
  icon?: React.FC<{ className?: string }> 
}> = ({ value, label, negative, highlight, icon: Icon }) => (
  <div className={`text-center p-4 rounded-lg border ${
    negative ? 'border-destructive/30 bg-destructive/5' : 
    highlight ? 'border-primary/30 bg-primary/5' : 
    'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-primary' : negative ? 'text-destructive' : 'text-muted-foreground'}`} />}
    <p className={`text-2xl font-semibold ${negative ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
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
    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{title || "Detailed Analysis"}</p>
    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{detail}</p>
  </div>
);

const DataPreview: React.FC<{ data: DataRow[]; columns: string[] }> = ({ data, columns }) => {
  const [expanded, setExpanded] = useState(false);
  
  const downloadCSV = () => {
    const header = columns.join(',');
    const rows = data.map(row => columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val;
    }).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'attribution_data.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} touchpoints</Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
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
                {columns.slice(0, 7).map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 15).map((row, i) => (
                <TableRow key={i}>
                  {columns.slice(0, 7).map(col => (
                    <TableCell key={col} className="text-xs py-1.5">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length > 15 && (
            <p className="text-xs text-muted-foreground p-2 text-center">
              Showing first 15 of {data.length} rows
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
            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const ChannelBadge: React.FC<{ channel: string }> = ({ channel }) => {
  const color = CHANNEL_COLORS[channel] || '#6b7280';
  const Icon = CHANNEL_ICONS[channel] || Globe;
  
  return (
    <Badge style={{ backgroundColor: color, color: 'white' }} className="gap-1 text-xs">
      <Icon className="w-3 h-3" />
      {channel}
    </Badge>
  );
};

const AttributionBar: React.FC<{ value: number; maxValue: number; color?: string }> = ({ value, maxValue, color = '#3b82f6' }) => {
  const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <div className="w-full">
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(width, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
// ============ INTRO PAGE ============
const IntroPage: React.FC<{ 
  onLoadSample: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      {/* 제목 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Share2 className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Marketing Attribution Modeling</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Understand which marketing channels drive conversions.
          Compare different attribution models to optimize your marketing spend.
        </p>
      </div>
      
      {/* ❌ 5개 모델 카드 삭제 → 3개 핵심 기능 카드로 교체 */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Multi-Touch Attribution</p>
              <p className="text-xs text-muted-foreground">6 attribution models</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Customer Journey</p>
              <p className="text-xs text-muted-foreground">Path analysis</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Budget Optimization</p>
              <p className="text-xs text-muted-foreground">Channel ROI</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            About Attribution Modeling
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">What You'll Learn</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Channel contribution to conversions",
                  "First-touch vs last-touch performance",
                  "Assisted conversions by channel",
                  "Optimal budget allocation",
                  "Customer journey analysis",
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
                  "Journey/User ID column",
                  "Channel/Touchpoint column",
                  "Touchpoint order or timestamp",
                  "Conversion flag (0/1)",
                  "Conversion value (optional)",
                ].map((req) => (
                  <li key={req} className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 버튼 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onLoadSample} className="gap-2">
              <Activity className="w-4 h-4" />
              Load Sample Data
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
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

// ============ MAIN COMPONENT START ============
export default function AttributionModelingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<AttributionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Configuration
  const [journeyIdCol, setJourneyIdCol] = useState<string>("");
  const [channelCol, setChannelCol] = useState<string>("");
  const [orderCol, setOrderCol] = useState<string>("");
  const [convertedCol, setConvertedCol] = useState<string>("");
  const [valueCol, setValueCol] = useState<string>("");
  const [timeDecayHalfLife, setTimeDecayHalfLife] = useState<number>(7);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    setJourneyIdCol("journey_id");
    setChannelCol("channel");
    setOrderCol("touchpoint_order");
    setConvertedCol("converted");
    setValueCol("conversion_value");
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

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const uniqueJourneys = new Set(data.map(d => d[journeyIdCol])).size;
    const uniqueChannels = new Set(data.map(d => d[channelCol])).size;
    
    return [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length} touchpoints loaded` : "No data loaded"
      },
      {
        name: "Journey ID Column",
        passed: !!journeyIdCol,
        message: journeyIdCol ? `Using: ${journeyIdCol} (${uniqueJourneys} journeys)` : "Select journey ID column"
      },
      {
        name: "Channel Column",
        passed: !!channelCol,
        message: channelCol ? `Using: ${channelCol} (${uniqueChannels} channels)` : "Select channel column"
      },
      {
        name: "Touchpoint Order",
        passed: !!orderCol,
        message: orderCol ? `Using: ${orderCol}` : "Select order/timestamp column"
      },
      {
        name: "Conversion Column",
        passed: !!convertedCol,
        message: convertedCol ? `Using: ${convertedCol}` : "Select conversion flag column"
      },
    ];
  }, [data, journeyIdCol, channelCol, orderCol, convertedCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        journey_id_col: journeyIdCol,
        channel_col: channelCol,
        order_col: orderCol,
        converted_col: convertedCol,
        value_col: valueCol || null,
        time_decay_half_life: timeDecayHalfLife,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/attribution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: AttributionResult = await res.json();
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
    const { channel_attribution } = results.results;
    
    const rows: string[] = ['Channel,First Touch,Last Touch,Linear,Time Decay,Position Based,Conversions,Total Value'];
    channel_attribution.forEach(c => {
      rows.push(`${c.channel},${c.first_touch.toFixed(2)},${c.last_touch.toFixed(2)},${c.linear.toFixed(2)},${c.time_decay.toFixed(2)},${c.position_based.toFixed(2)},${c.conversions},${c.total_value.toFixed(2)}`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'attribution_analysis.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `attribution_${chartKey}.png`;
    a.click();
  };

  // ============ STEP 2: CONFIG ============
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Attribution Analysis
        </CardTitle>
        <CardDescription>
          Map your data columns for attribution modeling
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Columns */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Required Columns
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Journey/User ID *</Label>
              <Select value={journeyIdCol || "__none__"} onValueChange={v => setJourneyIdCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel/Touchpoint *</Label>
              <Select value={channelCol || "__none__"} onValueChange={v => setChannelCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Touchpoint Order/Timestamp *</Label>
              <Select value={orderCol || "__none__"} onValueChange={v => setOrderCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conversion Flag (0/1) *</Label>
              <Select value={convertedCol || "__none__"} onValueChange={v => setConvertedCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Optional Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Optional Settings
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Conversion Value Column</Label>
              <Select value={valueCol || "__none__"} onValueChange={v => setValueCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- None --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time Decay Half-Life (days)</Label>
              <Select value={String(timeDecayHalfLife)} onValueChange={v => setTimeDecayHalfLife(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days (default)</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
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
                  Run Attribution
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
  // ============ STEP 4: SUMMARY ============
  const renderStep4Summary = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights } = results;
    const maxAttribution = Math.max(...r.channel_attribution.map(c => Math.max(c.first_touch, c.last_touch, c.linear)));
    
    const finding = `Analyzed ${r.summary.total_conversions} conversions worth ${formatCurrency(r.summary.total_value)} across ${r.summary.unique_channels} channels. Best first-touch: ${summary.best_first_touch}. Best last-touch: ${summary.best_last_touch}. Average path: ${summary.avg_path_length.toFixed(1)} touchpoints.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Attribution Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={r.summary.total_conversions.toLocaleString()} 
              label="Total Conversions" 
              icon={ShoppingCart}
              highlight
            />
            <MetricCard 
              value={formatCurrency(r.summary.total_value)} 
              label="Total Value" 
              icon={DollarSign}
            />
            <MetricCard 
              value={r.summary.unique_channels} 
              label="Channels" 
              icon={Share2}
            />
            <MetricCard 
              value={`${r.summary.avg_path_length.toFixed(1)}`} 
              label="Avg Path Length" 
              icon={ArrowRightLeft}
            />
          </div>
          
          {/* Channel Attribution Comparison */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Channel Attribution by Model
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">First Touch</TableHead>
                    <TableHead className="text-right">Last Touch</TableHead>
                    <TableHead className="text-right">Linear</TableHead>
                    <TableHead className="text-right">Time Decay</TableHead>
                    <TableHead className="text-right">Position Based</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.channel_attribution.map((c) => (
                    <TableRow key={c.channel}>
                      <TableCell>
                        <ChannelBadge channel={c.channel} />
                      </TableCell>
                      <TableCell className="text-right font-medium">{c.first_touch.toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-medium">{c.last_touch.toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-medium">{c.linear.toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-medium">{c.time_decay.toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-medium">{c.position_based.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{c.conversions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {/* Visual Comparison */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              First Touch vs Last Touch Comparison
            </h4>
            <div className="space-y-3">
              {r.channel_attribution.slice(0, 8).map((c) => (
                <div key={c.channel} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <ChannelBadge channel={c.channel} />
                    <div className="flex gap-4 text-xs">
                      <span className="text-blue-500">First: {c.first_touch.toFixed(1)}%</span>
                      <span className="text-green-500">Last: {c.last_touch.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="flex gap-1 h-2">
                    <div 
                      className="h-full rounded-l bg-blue-500"
                      style={{ width: `${(c.first_touch / maxAttribution) * 50}%` }}
                    />
                    <div 
                      className="h-full rounded-r bg-green-500"
                      style={{ width: `${(c.last_touch / maxAttribution) * 50}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Top Conversion Paths */}
          {r.top_paths && r.top_paths.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                Top Conversion Paths
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">Conv. Rate</TableHead>
                    <TableHead className="text-right">Avg Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.top_paths.slice(0, 8).map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{p.path}</TableCell>
                      <TableCell className="text-right">{p.conversions}</TableCell>
                      <TableCell className="text-right">{formatPercent(p.conversion_rate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.avg_value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Key Insights */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.map((insight, idx) => (
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
          
          <DetailParagraph
            title="Summary Interpretation"
            detail={`Attribution analysis across ${r.summary.unique_channels} channels with ${r.summary.total_touchpoints.toLocaleString()} touchpoints.

■ Channel Performance

• Best First Touch: ${summary.best_first_touch} - Most effective at starting customer journeys
• Best Last Touch: ${summary.best_last_touch} - Most effective at closing conversions
• Most Assisted: ${summary.most_assisted} - Valuable mid-funnel contributor

■ Customer Journey

• Total Conversions: ${r.summary.total_conversions.toLocaleString()}
• Conversion Rate: ${formatPercent(r.summary.conversion_rate)}
• Average Path Length: ${r.summary.avg_path_length.toFixed(1)} touchpoints
• Total Value: ${formatCurrency(r.summary.total_value)}

■ Model Differences

Different models highlight different channel strengths:
• First Touch: Best for awareness channels
• Last Touch: Best for conversion channels
• Linear: Fair credit to all touchpoints
• Time Decay: Recent touchpoints weighted higher
• Position Based: 40% first, 40% last, 20% middle

■ Recommendations

${r.channel_attribution[0]?.first_touch > r.channel_attribution[0]?.last_touch 
  ? `• ${r.channel_attribution[0]?.channel} is strong at awareness - good for top-of-funnel`
  : `• ${r.channel_attribution[0]?.channel} is strong at conversion - good for bottom-of-funnel`}
• Consider multi-touch attribution for budget allocation
• Test channel combinations from top converting paths`}
          />
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">
              Understand Results
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 5: WHY ============
  const renderStep5Why = () => {
    if (!results) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5 text-primary" />
            Understanding Attribution Models
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Attribution modeling assigns conversion credit to marketing touchpoints. Different models reveal different insights about your marketing funnel." />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Attribution Model Comparison</h4>
            <div className="grid gap-4">
              {[
                { 
                  model: "First Touch", 
                  icon: MousePointer,
                  formula: "100% to first touchpoint",
                  best: "Measuring awareness channel effectiveness",
                  limit: "Ignores nurturing channels"
                },
                { 
                  model: "Last Touch", 
                  icon: ShoppingCart,
                  formula: "100% to last touchpoint",
                  best: "Measuring conversion channel effectiveness",
                  limit: "Ignores awareness channels"
                },
                { 
                  model: "Linear", 
                  icon: ArrowRightLeft,
                  formula: "Equal credit: 1/n to each touchpoint",
                  best: "Fair view when all touchpoints matter equally",
                  limit: "May overweight low-impact touchpoints"
                },
                { 
                  model: "Time Decay", 
                  icon: TrendingUp,
                  formula: "Exponential decay: recent = more credit",
                  best: "Short sales cycles, time-sensitive purchases",
                  limit: "Undervalues initial awareness"
                },
                { 
                  model: "Position Based (U-shaped)", 
                  icon: Target,
                  formula: "40% first + 40% last + 20% middle",
                  best: "Balanced view of full funnel",
                  limit: "Fixed weights may not fit all businesses"
                },
              ].map((m) => (
                <div key={m.model} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <m.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{m.model}</p>
                      <p className="text-xs text-muted-foreground">Formula: {m.formula}</p>
                      <p className="text-xs text-green-600">✓ Best for: {m.best}</p>
                      <p className="text-xs text-amber-600">⚠ Limitation: {m.limit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Which Model to Use */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Which Model Should You Use?</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-primary mb-2">Short Sales Cycle (&lt;7 days)</p>
                <p className="text-xs text-muted-foreground">Use Last Touch or Time Decay. The final touchpoints are most influential.</p>
              </div>
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-primary mb-2">Long Sales Cycle (&gt;30 days)</p>
                <p className="text-xs text-muted-foreground">Use Position Based or Linear. All touchpoints contribute to the journey.</p>
              </div>
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-primary mb-2">Brand Awareness Focus</p>
                <p className="text-xs text-muted-foreground">Use First Touch. Identifies which channels drive discovery.</p>
              </div>
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-primary mb-2">Balanced View</p>
                <p className="text-xs text-muted-foreground">Compare all models. Look for consistent patterns across models.</p>
              </div>
            </div>
          </div>
          
          <DetailParagraph
            title="Budget Allocation Strategy"
            detail={`Based on attribution results:

■ Awareness Budget (Top of Funnel)
Allocate to channels with high First Touch attribution.
These channels are good at initiating customer journeys.

■ Consideration Budget (Middle of Funnel)
Allocate to channels with high Linear but low First/Last Touch.
These channels assist conversions but rarely start or close.

■ Conversion Budget (Bottom of Funnel)
Allocate to channels with high Last Touch attribution.
These channels are good at closing conversions.

■ General Guidelines

1. Don't rely on a single model
2. Compare First vs Last Touch to understand channel role
3. High-value paths suggest effective channel combinations
4. Test incrementally - reduce low-performing channel spend
5. Consider assisted conversions, not just direct`}
          />
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button>
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
    
    const { summary, results: r, key_insights, visualizations } = results;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Attribution Analysis Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Marketing Channel Attribution | {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={r.summary.total_conversions.toLocaleString()} label="Conversions" />
              <MetricCard value={formatCurrency(r.summary.total_value)} label="Total Value" />
              <MetricCard value={summary.best_first_touch} label="Best First Touch" />
              <MetricCard value={`${summary.solve_time_ms}ms`} label="Calc Time" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Analyzed {r.summary.total_touchpoints.toLocaleString()} touchpoints across {r.summary.unique_channels} channels.
              Best first-touch channel: {summary.best_first_touch}. Best last-touch: {summary.best_last_touch}.
              Average conversion path: {summary.avg_path_length.toFixed(1)} touchpoints.
            </p>
          </CardContent>
        </Card>
        
        {/* Key Insights */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {key_insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                ins.status === "warning" ? "border-destructive/30 bg-destructive/5" :
                ins.status === "positive" ? "border-primary/30 bg-primary/5" :
                "border-border bg-muted/10"
              }`}>
                {ins.status === "warning" ? <AlertCircle className="w-4 h-4 text-destructive mt-0.5" /> :
                 ins.status === "positive" ? <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" /> :
                 <Info className="w-4 h-4 text-muted-foreground mt-0.5" />}
                <div>
                  <p className="font-medium text-sm">{ins.title}</p>
                  <p className="text-sm text-muted-foreground">{ins.description}</p>
                </div>
              </div>
            ))}
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
                  {visualizations.attribution_comparison && <TabsTrigger value="attribution_comparison" className="text-xs">Model Comparison</TabsTrigger>}
                  {visualizations.channel_contribution && <TabsTrigger value="channel_contribution" className="text-xs">Contribution</TabsTrigger>}
                  {visualizations.conversion_funnel && <TabsTrigger value="conversion_funnel" className="text-xs">Funnel</TabsTrigger>}
                  {visualizations.transition_heatmap && <TabsTrigger value="transition_heatmap" className="text-xs">Transitions</TabsTrigger>}
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
        
        {/* Attribution Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Channel Attribution (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">First</TableHead>
                  <TableHead className="text-right">Last</TableHead>
                  <TableHead className="text-right">Linear</TableHead>
                  <TableHead className="text-right">Time Decay</TableHead>
                  <TableHead className="text-right">Position</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.channel_attribution.map((c) => (
                  <TableRow key={c.channel}>
                    <TableCell><ChannelBadge channel={c.channel} /></TableCell>
                    <TableCell className="text-right">{c.first_touch.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{c.last_touch.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{c.linear.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{c.time_decay.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{c.position_based.toFixed(1)}%</TableCell>
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
        This analysis is a decision-making support tool based on statistical models and historical data. 
        Results are probabilistic estimates and actual outcomes may vary due to data quality, market conditions, 
        and other external factors. This information does not guarantee specific results, and all decisions 
        based on this analysis remain the sole responsibility of the user.
      </p>
    </div>
  </CardContent>
</Card>


        {/* Export */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                CSV (Attribution Data)
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
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="gap-2">
            <HelpCircle className="w-4 h-4" />Help
          </Button>
        </div>
      )}
      
      {currentStep > 1 && (
        <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />
      )}
      
      {currentStep > 1 && data.length > 0 && (
        <DataPreview data={data} columns={columns} />
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
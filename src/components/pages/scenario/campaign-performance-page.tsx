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
  Megaphone, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Target, BarChart3, Play, DollarSign, Users,
  TrendingDown, Percent, MousePointer, Eye, ShoppingCart,
  ArrowUpRight, ArrowDownRight, Mail, Share2, Zap,
  Award, Calendar, Globe, Smartphone, Monitor,
  Clock, RefreshCw, PieChart, LineChart
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface CampaignMetrics {
  campaign_id: string;
  campaign_name: string;
  channel: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  cpc: number;
  cpa: number;
  roas: number;
  roi: number;
  performance_score: number;
  performance_tier: string;
}

interface ChannelSummary {
  channel: string;
  campaigns: number;
  total_spend: number;
  total_revenue: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  avg_ctr: number;
  avg_cvr: number;
  avg_cpa: number;
  roas: number;
  roi: number;
}

interface TimeTrend {
  period: string;
  spend: number;
  revenue: number;
  conversions: number;
  roas: number;
}

interface CampaignResult {
  success: boolean;
  results: {
    summary: {
      total_campaigns: number;
      total_spend: number;
      total_revenue: number;
      total_impressions: number;
      total_clicks: number;
      total_conversions: number;
      overall_ctr: number;
      overall_cvr: number;
      overall_cpa: number;
      overall_roas: number;
      overall_roi: number;
      top_performer: string;
      worst_performer: string;
    };
    campaign_metrics: CampaignMetrics[];
    channel_summary: ChannelSummary[];
    time_trends: TimeTrend[];
    performance_distribution: {
      tier: string;
      count: number;
      pct: number;
    }[];
    recommendations: {
      priority: string;
      category: string;
      recommendation: string;
      impact: string;
    }[];
  };
  visualizations: {
    channel_performance?: string;
    roas_comparison?: string;
    spend_vs_revenue?: string;
    conversion_funnel?: string;
    time_trend?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_date: string;
    best_channel: string;
    worst_channel: string;
    solve_time_ms: number;
  };
}

// ============ CONSTANTS ============
const CHANNELS = [
  { value: "google_ads", label: "Google Ads", icon: Globe },
  { value: "facebook", label: "Facebook/Meta", icon: Users },
  { value: "instagram", label: "Instagram", icon: Smartphone },
  { value: "email", label: "Email", icon: Mail },
  { value: "display", label: "Display", icon: Monitor },
  { value: "affiliate", label: "Affiliate", icon: Share2 },
];

const METRIC_DEFINITIONS = [
  { metric: "CTR", formula: "Clicks / Impressions × 100", benchmark: "2-5%" },
  { metric: "CVR", formula: "Conversions / Clicks × 100", benchmark: "2-5%" },
  { metric: "CPC", formula: "Spend / Clicks", benchmark: "$0.50-$2.00" },
  { metric: "CPA", formula: "Spend / Conversions", benchmark: "Varies" },
  { metric: "ROAS", formula: "Revenue / Spend", benchmark: ">3x" },
  { metric: "ROI", formula: "(Revenue - Spend) / Spend × 100", benchmark: ">100%" },
];

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  const channels = ['Google Ads', 'Facebook', 'Instagram', 'Email', 'Display', 'Affiliate'];
  const objectives = ['Awareness', 'Consideration', 'Conversion', 'Retention'];
  const data: DataRow[] = [];
  
  const startDate = new Date('2024-01-01');
  
  for (let i = 1; i <= 50; i++) {
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const objective = objectives[Math.floor(Math.random() * objectives.length)];
    
    // Channel-specific benchmarks
    const channelMultipliers: { [key: string]: { ctr: number; cvr: number; cpc: number } } = {
      'Google Ads': { ctr: 1.0, cvr: 1.0, cpc: 1.0 },
      'Facebook': { ctr: 0.8, cvr: 0.9, cpc: 0.7 },
      'Instagram': { ctr: 0.9, cvr: 0.8, cpc: 0.8 },
      'Email': { ctr: 2.0, cvr: 1.5, cpc: 0.1 },
      'Display': { ctr: 0.3, cvr: 0.5, cpc: 0.5 },
      'Affiliate': { ctr: 1.2, cvr: 1.3, cpc: 0.0 },
    };
    
    const mult = channelMultipliers[channel];
    
    // Generate realistic metrics
    const spend = Math.floor(Math.random() * 10000) + 500;
    const impressions = Math.floor(spend * (50 + Math.random() * 100));
    const baseCtr = (2 + Math.random() * 3) * mult.ctr;
    const clicks = Math.floor(impressions * baseCtr / 100);
    const baseCvr = (2 + Math.random() * 4) * mult.cvr;
    const conversions = Math.floor(clicks * baseCvr / 100);
    
    // Revenue based on conversions with some variance
    const avgOrderValue = 50 + Math.random() * 150;
    const revenue = conversions * avgOrderValue * (0.8 + Math.random() * 0.4);
    
    // Random date within year
    const campaignDate = new Date(startDate);
    campaignDate.setDate(campaignDate.getDate() + Math.floor(Math.random() * 365));
    
    data.push({
      campaign_id: `CMP-${String(i).padStart(4, '0')}`,
      campaign_name: `${channel} ${objective} Campaign ${i}`,
      channel,
      objective,
      start_date: campaignDate.toISOString().split('T')[0],
      impressions,
      clicks,
      conversions,
      spend: parseFloat(spend.toFixed(2)),
      revenue: parseFloat(revenue.toFixed(2)),
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

const PerformanceBadge: React.FC<{ tier: string }> = ({ tier }) => {
  const colors: { [key: string]: string } = {
    'Excellent': 'bg-green-100 text-green-700',
    'Good': 'bg-blue-100 text-blue-700',
    'Average': 'bg-yellow-100 text-yellow-700',
    'Poor': 'bg-orange-100 text-orange-700',
    'Critical': 'bg-red-100 text-red-700',
  };
  return <Badge className={`${colors[tier] || 'bg-gray-100 text-gray-700'} text-xs`}>{tier}</Badge>;
};

const ROASIndicator: React.FC<{ roas: number }> = ({ roas }) => {
  const color = roas >= 4 ? 'text-green-600' : roas >= 2 ? 'text-blue-600' : roas >= 1 ? 'text-yellow-600' : 'text-red-600';
  return <span className={`font-mono font-medium ${color}`}>{roas.toFixed(2)}x</span>;
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const formatNumber = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
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
          <Megaphone className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Campaign Performance Evaluation</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Analyze marketing campaign performance across channels with ROI/ROAS metrics,
          conversion funnels, and actionable optimization recommendations.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            About Campaign Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">What You'll Learn</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "ROI/ROAS across campaigns and channels",
                  "CTR, CVR, CPC, CPA performance metrics",
                  "Top and underperforming campaigns",
                  "Channel-level comparisons",
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
                  "Campaign ID (unique identifier)",
                  "Impressions (ad views)",
                  "Clicks (user clicks)",
                  "Spend (campaign cost)",
                  "Conversions, Revenue (optional)",
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
          <p className="text-xs text-muted-foreground text-center mt-3">
            Sample: 50 campaigns across 6 channels with full performance metrics
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ MAIN COMPONENT ============
export default function CampaignPerformancePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<CampaignResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Configuration
  const [campaignIdCol, setCampaignIdCol] = useState<string>("");
  const [campaignNameCol, setCampaignNameCol] = useState<string>("");
  const [channelCol, setChannelCol] = useState<string>("");
  const [impressionsCol, setImpressionsCol] = useState<string>("");
  const [clicksCol, setClicksCol] = useState<string>("");
  const [conversionsCol, setConversionsCol] = useState<string>("");
  const [spendCol, setSpendCol] = useState<string>("");
  const [revenueCol, setRevenueCol] = useState<string>("");
  const [dateCol, setDateCol] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    
    // Auto-configure
    setCampaignIdCol("campaign_id");
    setCampaignNameCol("campaign_name");
    setChannelCol("channel");
    setImpressionsCol("impressions");
    setClicksCol("clicks");
    setConversionsCol("conversions");
    setSpendCol("spend");
    setRevenueCol("revenue");
    setDateCol("start_date");
    
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
    return [
      { name: "Data Loaded", passed: data.length > 0, message: data.length > 0 ? `${data.length} campaigns loaded` : "No data" },
      { name: "Campaign ID", passed: !!campaignIdCol, message: campaignIdCol ? `Using: ${campaignIdCol}` : "Select campaign ID column" },
      { name: "Impressions", passed: !!impressionsCol, message: impressionsCol ? `Using: ${impressionsCol}` : "Select impressions column" },
      { name: "Clicks", passed: !!clicksCol, message: clicksCol ? `Using: ${clicksCol}` : "Select clicks column" },
      { name: "Spend", passed: !!spendCol, message: spendCol ? `Using: ${spendCol}` : "Select spend column" },
    ];
  }, [data, campaignIdCol, impressionsCol, clicksCol, spendCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        campaign_id_col: campaignIdCol,
        campaign_name_col: campaignNameCol || null,
        channel_col: channelCol || null,
        impressions_col: impressionsCol,
        clicks_col: clicksCol,
        conversions_col: conversionsCol || null,
        spend_col: spendCol,
        revenue_col: revenueCol || null,
        date_col: dateCol || null,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/campaign-performance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: CampaignResult = await res.json();
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
    const rows: string[] = ['Campaign ID,Campaign Name,Channel,Impressions,Clicks,Conversions,Spend,Revenue,CTR,CVR,CPC,CPA,ROAS,ROI,Performance'];
    results.results.campaign_metrics.forEach(c => {
      rows.push(`${c.campaign_id},${c.campaign_name},${c.channel},${c.impressions},${c.clicks},${c.conversions},${c.spend},${c.revenue},${c.ctr.toFixed(2)}%,${c.cvr.toFixed(2)}%,$${c.cpc.toFixed(2)},$${c.cpa.toFixed(2)},${c.roas.toFixed(2)}x,${c.roi.toFixed(2)}%,${c.performance_tier}`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'campaign_performance.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `campaign_${chartKey}.png`;
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
              {[
                { label: "Campaign ID *", value: campaignIdCol, setter: setCampaignIdCol },
                { label: "Impressions *", value: impressionsCol, setter: setImpressionsCol },
                { label: "Clicks *", value: clicksCol, setter: setClicksCol },
                { label: "Spend *", value: spendCol, setter: setSpendCol },
              ].map((field) => (
                <div key={field.label} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Select value={field.value || "__none__"} onValueChange={v => field.setter(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Select --</SelectItem>
                      {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Optional Columns */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              Optional Columns
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: "Campaign Name", value: campaignNameCol, setter: setCampaignNameCol },
                { label: "Channel", value: channelCol, setter: setChannelCol },
                { label: "Conversions", value: conversionsCol, setter: setConversionsCol },
                { label: "Revenue", value: revenueCol, setter: setRevenueCol },
                { label: "Date", value: dateCol, setter: setDateCol },
              ].map((field) => (
                <div key={field.label} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Select value={field.value || "__none__"} onValueChange={v => field.setter(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- None --</SelectItem>
                      {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
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
    
    const finding = `Total spend: ${formatCurrency(r.summary.total_spend)} generated ${formatCurrency(r.summary.total_revenue)} revenue. ` +
      `Overall ROAS: ${r.summary.overall_roas.toFixed(2)}x, ROI: ${r.summary.overall_roi.toFixed(0)}%. ` +
      `Top performer: ${r.summary.top_performer}.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="w-5 h-5 text-primary" />
            Campaign Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={formatCurrency(r.summary.total_spend)}
              label="Total Spend" 
              icon={DollarSign}
            />
            <MetricCard 
              value={formatCurrency(r.summary.total_revenue)}
              label="Total Revenue" 
              icon={ShoppingCart}
              highlight
            />
            <MetricCard 
              value={`${r.summary.overall_roas.toFixed(2)}x`}
              label="Overall ROAS" 
              icon={TrendingUp}
              highlight={r.summary.overall_roas >= 3}
              negative={r.summary.overall_roas < 1}
            />
            <MetricCard 
              value={`${r.summary.overall_roi.toFixed(0)}%`}
              label="Overall ROI" 
              icon={Percent}
              highlight={r.summary.overall_roi >= 100}
              negative={r.summary.overall_roi < 0}
            />
          </div>
          
          {/* Funnel Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={formatNumber(r.summary.total_impressions)}
              label="Impressions" 
              icon={Eye}
            />
            <MetricCard 
              value={formatNumber(r.summary.total_clicks)}
              label="Clicks" 
              sublabel={`CTR: ${r.summary.overall_ctr.toFixed(2)}%`}
              icon={MousePointer}
            />
            <MetricCard 
              value={formatNumber(r.summary.total_conversions)}
              label="Conversions" 
              sublabel={`CVR: ${r.summary.overall_cvr.toFixed(2)}%`}
              icon={Target}
            />
            <MetricCard 
              value={formatCurrency(r.summary.overall_cpa)}
              label="Avg CPA" 
              icon={DollarSign}
            />
          </div>
          
          {/* Performance Distribution */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Campaign Performance Distribution
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {r.performance_distribution.map((dist) => (
                <div key={dist.tier} className={`text-center p-3 rounded-lg border ${
                  dist.tier === 'Excellent' ? 'border-green-500/30 bg-green-500/5' :
                  dist.tier === 'Good' ? 'border-blue-500/30 bg-blue-500/5' :
                  dist.tier === 'Average' ? 'border-yellow-500/30 bg-yellow-500/5' :
                  dist.tier === 'Poor' ? 'border-orange-500/30 bg-orange-500/5' :
                  'border-red-500/30 bg-red-500/5'
                }`}>
                  <p className="text-2xl font-bold">{dist.count}</p>
                  <p className="text-xs text-muted-foreground">{dist.tier}</p>
                  <p className="text-xs text-muted-foreground">({(dist.pct * 100).toFixed(0)}%)</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Top Campaigns */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Top Performing Campaigns
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.campaign_metrics.slice(0, 10).map((c) => (
                  <TableRow key={c.campaign_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm truncate max-w-32">{c.campaign_name}</p>
                        <p className="text-xs text-muted-foreground">{c.campaign_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{c.channel}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(c.spend)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.revenue)}</TableCell>
                    <TableCell className="text-right"><ROASIndicator roas={c.roas} /></TableCell>
                    <TableCell className={`text-right ${c.roi >= 100 ? 'text-green-600' : c.roi >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {c.roi.toFixed(0)}%
                    </TableCell>
                    <TableCell><PerformanceBadge tier={c.performance_tier} /></TableCell>
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
              View Channel Analysis
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 5: CHANNELS ============
  const renderStep5Why = () => {
    if (!results) return null;
    
    const { results: r } = results;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="w-5 h-5 text-primary" />
            Channel Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={`Best channel: ${results.summary.best_channel} with highest ROAS. Worst: ${results.summary.worst_channel}. Consider reallocating budget from underperforming channels.`} />
          
          {/* Channel Summary */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Channel Comparison
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Campaigns</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">CVR</TableHead>
                  <TableHead className="text-right">CPA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.channel_summary.map((ch) => (
                  <TableRow key={ch.channel}>
                    <TableCell className="font-medium">{ch.channel}</TableCell>
                    <TableCell className="text-right">{ch.campaigns}</TableCell>
                    <TableCell className="text-right">{formatCurrency(ch.total_spend)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(ch.total_revenue)}</TableCell>
                    <TableCell className="text-right"><ROASIndicator roas={ch.roas} /></TableCell>
                    <TableCell className={`text-right ${ch.roi >= 100 ? 'text-green-600' : ch.roi >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {ch.roi.toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right">{ch.avg_ctr.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">{ch.avg_cvr.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(ch.avg_cpa)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Channel Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {r.channel_summary.slice(0, 6).map((ch) => (
              <div key={ch.channel} className={`p-4 rounded-lg border ${
                ch.roas >= 3 ? 'border-green-500/30 bg-green-500/5' :
                ch.roas >= 2 ? 'border-blue-500/30 bg-blue-500/5' :
                ch.roas >= 1 ? 'border-yellow-500/30 bg-yellow-500/5' :
                'border-red-500/30 bg-red-500/5'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{ch.channel}</span>
                  <ROASIndicator roas={ch.roas} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Spend</p>
                    <p className="font-medium">{formatCurrency(ch.total_spend)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Revenue</p>
                    <p className="font-medium">{formatCurrency(ch.total_revenue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Conversions</p>
                    <p className="font-medium">{formatNumber(ch.total_conversions)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">CPA</p>
                    <p className="font-medium">{formatCurrency(ch.avg_cpa)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
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
          <h1 className="text-xl font-semibold">Campaign Performance Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {r.summary.total_campaigns} Campaigns | {s.analysis_date}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={formatCurrency(r.summary.total_spend)} label="Total Spend" />
              <MetricCard value={formatCurrency(r.summary.total_revenue)} label="Total Revenue" />
              <MetricCard value={`${r.summary.overall_roas.toFixed(2)}x`} label="Overall ROAS" />
              <MetricCard value={`${r.summary.overall_roi.toFixed(0)}%`} label="Overall ROI" />
            </div>
            <p className="text-sm text-muted-foreground">
              Analysis of {r.summary.total_campaigns} campaigns. 
              Best performer: {r.summary.top_performer}. 
              Best channel: {s.best_channel}. 
              {r.summary.overall_roas >= 3 ? ' Overall performance is strong.' : r.summary.overall_roas >= 1 ? ' Performance is acceptable with room for improvement.' : ' Performance needs immediate attention.'}
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
                  {visualizations.channel_performance && <TabsTrigger value="channel_performance" className="text-xs">Channel ROAS</TabsTrigger>}
                  {visualizations.spend_vs_revenue && <TabsTrigger value="spend_vs_revenue" className="text-xs">Spend vs Revenue</TabsTrigger>}
                  {visualizations.conversion_funnel && <TabsTrigger value="conversion_funnel" className="text-xs">Funnel</TabsTrigger>}
                  {visualizations.roas_comparison && <TabsTrigger value="roas_comparison" className="text-xs">Campaign ROAS</TabsTrigger>}
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
        
        {/* Full Campaign Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.campaign_metrics.map((c) => (
                    <TableRow key={c.campaign_id}>
                      <TableCell className="font-medium truncate max-w-40">{c.campaign_name}</TableCell>
                      <TableCell>{c.channel}</TableCell>
                      <TableCell className="text-right"><ROASIndicator roas={c.roas} /></TableCell>
                      <TableCell className={`text-right ${c.roi >= 100 ? 'text-green-600' : c.roi >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {c.roi.toFixed(0)}%
                      </TableCell>
                      <TableCell><PerformanceBadge tier={c.performance_tier} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                CSV (Full Analysis)
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
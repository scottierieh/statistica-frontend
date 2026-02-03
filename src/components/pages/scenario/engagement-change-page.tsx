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
  ChevronRight, Calendar, Users, Zap, LineChart,
  BarChart3, TrendingDown, Target, AlertTriangle
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface Changepoint {
  index: number;
  date: string;
  value: number;
  z_score: number;
}

interface EngagementResult {
  success: boolean;
  results: {
    engagement_metric: string;
    period: string;
    periods_analyzed: number;
    trend_analysis: {
      trend_direction: string;
      trend_strength: number;
      slope: number;
      r_squared: number;
      p_value: number;
      recent_avg: number;
      historical_avg: number;
      change_percentage: number;
      volatility: number;
      avg_growth_rate: number;
      current_value: number;
      peak_value: number;
      trough_value: number;
    };
    changepoints: Changepoint[];
    segment_distribution: { [key: string]: number };
  };
  visualizations: {
    trend_line?: string;
    growth_rate?: string;
    moving_average?: string;
    segmentation?: string;
    distribution?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    total_users: number;
    total_events: number;
    trend_direction: string;
    change_percentage: number;
    num_changepoints: number;
  };
}

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const numUsers = 500;
  const startDate = new Date('2024-01-01');
  
  for (let i = 0; i < numUsers; i++) {
    const userId = `USER_${String(i + 1).padStart(4, '0')}`;
    
    // Determine user engagement pattern
    const userType = Math.random();
    let baseEngagement = 0;
    let growthRate = 0;
    
    if (userType < 0.25) {
      // Power users - high and increasing
      baseEngagement = 15;
      growthRate = 0.05;
    } else if (userType < 0.5) {
      // Regular users - medium and stable
      baseEngagement = 8;
      growthRate = 0.01;
    } else if (userType < 0.75) {
      // Casual users - low and decreasing
      baseEngagement = 5;
      growthRate = -0.02;
    } else {
      // Low engagement - very low
      baseEngagement = 2;
      growthRate = -0.01;
    }
    
    // Generate events over 6 months (26 weeks)
    for (let week = 0; week < 26; week++) {
      const eventDate = new Date(startDate);
      eventDate.setDate(eventDate.getDate() + week * 7);
      
      // Add changepoint effect at week 13 (3 months)
      let changepointEffect = 0;
      if (week >= 13) {
        changepointEffect = userType < 0.5 ? 2 : -1;
      }
      
      // Calculate events for this week
      const trendEffect = baseEngagement * growthRate * week;
      const seasonalEffect = Math.sin(week / 4) * 2;
      const randomEffect = (Math.random() - 0.5) * 3;
      
      let eventsThisWeek = Math.max(0, Math.round(
        baseEngagement + trendEffect + changepointEffect + seasonalEffect + randomEffect
      ));
      
      // Generate individual events
      for (let e = 0; e < eventsThisWeek; e++) {
        const eventOffset = Math.floor(Math.random() * 7);
        const finalDate = new Date(eventDate);
        finalDate.setDate(finalDate.getDate() + eventOffset);
        
        data.push({
          user_id: userId,
          event_date: finalDate.toISOString().split('T')[0],
          event_type: Math.random() < 0.7 ? 'view' : 'action',
          event_value: Math.random() < 0.3 ? Math.floor(Math.random() * 100) : 0
        });
      }
    }
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
    <div className="flex items-center justify-center gap-2 mb-2">
      {Icon && <Icon className="w-5 h-5 text-primary" />}
      {trend && (
        trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-600" /> :
        trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-600" /> :
        <Activity className="w-4 h-4 text-muted-foreground" />
      )}
    </div>
    <p className={`text-2xl font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</p>
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
    a.download = 'engagement_source_data.csv';
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
const EngagementGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Engagement Change Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              What is Engagement Change Analysis?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Engagement change analysis detects and analyzes significant shifts in user engagement patterns over time. 
              It identifies when engagement increases or decreases, what causes these changes, and which user segments 
              are affected. This helps product teams understand the impact of features, campaigns, and external events.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3">Engagement Metrics</h3>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Event Count</p>
                <p className="text-xs text-muted-foreground">
                  Total number of events per period. Good for tracking overall activity volume.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Active Users</p>
                <p className="text-xs text-muted-foreground">
                  Unique users active in each period. Best for understanding user base growth/churn.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Events per User</p>
                <p className="text-xs text-muted-foreground">
                  Average events per active user. Measures engagement depth and intensity.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3">Changepoint Detection</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Changepoints are periods where engagement significantly deviates from the trend. Detection uses 
              statistical Z-scores to identify anomalies.
            </p>
            <div className="p-3 rounded-lg border border-border bg-muted/10">
              <p className="text-xs text-muted-foreground space-y-1">
                <strong>Z-score {'>'} 2.0:</strong> Significant change detected<br/>
                <strong>Common Causes:</strong> Product launches, marketing campaigns, seasonality, bugs, competitor actions
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3">User Segments</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm mb-1">Power Users (Top 25%)</p>
                <p className="text-xs text-muted-foreground">
                  Highest engagement. Critical to retain. Often advocates and early adopters.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Regular Users (25-50%)</p>
                <p className="text-xs text-muted-foreground">
                  Consistent moderate engagement. Core user base. Focus on activation.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Casual Users (50-75%)</p>
                <p className="text-xs text-muted-foreground">
                  Occasional engagement. Conversion opportunity. Need motivation to increase usage.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Low Engagement (Bottom 25%)</p>
                <p className="text-xs text-muted-foreground">
                  Minimal activity. At-risk users. Require re-engagement campaigns or acceptance of churn.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3">Trend Interpretation</h3>
            <div className="space-y-2">
              <div className="p-2 rounded border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm text-foreground">Increasing Trend</p>
                <p className="text-xs text-muted-foreground">Positive momentum. Product improvements working. Scale successful initiatives.</p>
              </div>
              <div className="p-2 rounded border border-border bg-muted/10">
                <p className="font-medium text-sm text-foreground">Stable Trend</p>
                <p className="text-xs text-muted-foreground">Consistent engagement. Good baseline. Focus on optimization and new features.</p>
              </div>
              <div className="p-2 rounded border border-border bg-muted/10">
                <p className="font-medium text-sm text-foreground">Decreasing Trend</p>
                <p className="text-xs text-muted-foreground">Declining engagement. Investigate causes immediately. User interviews recommended.</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Best Practice:</strong> Run engagement analysis weekly or monthly. 
              Compare recent periods to establish baseline, then monitor for changes. Act on declining trends within 
              2-3 periods to prevent long-term damage.
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
          <Activity className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">User Engagement Change Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Detect and analyze significant changes in user engagement patterns over time. Identify trends, 
          changepoints, and segments to understand what drives engagement and take data-driven action.
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
              <p className="text-xs text-muted-foreground">Growth patterns</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Changepoints</p>
              <p className="text-xs text-muted-foreground">Detect shifts</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Segmentation</p>
              <p className="text-xs text-muted-foreground">User tiers</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use Engagement Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "User ID column (unique identifier)",
                  "Date column (event timestamps)",
                  "Event data spanning multiple periods",
                  "At least 20 records total",
                  "Minimum 4 time periods for analysis"
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
                  "Engagement trend direction and strength",
                  "Significant changepoint detection",
                  "Period-over-period growth rates",
                  "User segmentation by engagement level",
                  "Statistical significance testing"
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
        <CardHeader>
          <CardTitle className="text-base">Use Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-border bg-muted/10">
              <p className="font-medium text-sm mb-1">Feature Launch Impact</p>
              <p className="text-xs text-muted-foreground">
                Measure engagement changes before/after new feature releases
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/10">
              <p className="font-medium text-sm mb-1">Marketing Campaign Effect</p>
              <p className="text-xs text-muted-foreground">
                Track engagement spikes during promotional periods
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/10">
              <p className="font-medium text-sm mb-1">Seasonal Pattern Detection</p>
              <p className="text-xs text-muted-foreground">
                Identify recurring engagement fluctuations
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/10">
              <p className="font-medium text-sm mb-1">Early Warning System</p>
              <p className="text-xs text-muted-foreground">
                Spot declining engagement before it becomes critical
              </p>
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
export default function EngagementChangeAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<EngagementResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const [userIdCol, setUserIdCol] = useState<string>("");
  const [dateCol, setDateCol] = useState<string>("");
  const [engagementMetric, setEngagementMetric] = useState<string>("event_count");
  const [period, setPeriod] = useState<string>("weekly");
  const [lookbackPeriods, setLookbackPeriods] = useState<number>(12);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setUserIdCol("user_id");
    setDateCol("event_date");
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
    return [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length.toLocaleString()} records` : "No data"
      },
      {
        name: "User ID Column",
        passed: !!userIdCol,
        message: userIdCol ? `Using: ${userIdCol}` : "Select user ID"
      },
      {
        name: "Date Column",
        passed: !!dateCol,
        message: dateCol ? `Using: ${dateCol}` : "Select date"
      },
      {
        name: "Sufficient Data",
        passed: data.length >= 20,
        message: data.length >= 20 ? "Good" : `Only ${data.length} (need ≥20)`
      }
    ];
  }, [data, userIdCol, dateCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        user_id_col: userIdCol,
        date_col: dateCol,
        engagement_metric: engagementMetric,
        period: period,
        lookback_periods: lookbackPeriods
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/engagement-change-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: EngagementResult = await res.json();
      setResults(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${base64}`;
    a.download = `engagement_${chartKey}.png`;
    a.click();
  };

  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>User ID Column *</Label>
            <Select value={userIdCol || "__none__"} onValueChange={v => setUserIdCol(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-- Select --</SelectItem>
                {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date Column *</Label>
            <Select value={dateCol || "__none__"} onValueChange={v => setDateCol(v === "__none__" ? "" : v)}>
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
            <Label>Engagement Metric</Label>
            <Select value={engagementMetric} onValueChange={setEngagementMetric}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="event_count">Event Count</SelectItem>
                <SelectItem value="active_users">Active Users</SelectItem>
                <SelectItem value="events_per_user">Events per User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Lookback Periods: {lookbackPeriods}</Label>
          <Input
            type="range"
            min={4}
            max={52}
            value={lookbackPeriods}
            onChange={(e) => setLookbackPeriods(parseInt(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Analyze last {lookbackPeriods} {period === 'daily' ? 'days' : period === 'weekly' ? 'weeks' : 'months'}
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => setCurrentStep(3)} className="gap-2">
            Continue <ArrowRight className="w-4 h-4" />
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
            Validation
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
                  {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
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

          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>Back</Button>
            <Button onClick={runAnalysis} disabled={loading || !canRun} className="gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>Run Analysis<ArrowRight className="w-4 h-4" /></>
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
    const trend = r.trend_analysis;
    
    const finding = `Analyzed ${summary.total_events.toLocaleString()} events from ${summary.total_users.toLocaleString()} users across ${r.periods_analyzed} ${r.period} periods. Engagement trend is ${summary.trend_direction} with ${summary.change_percentage > 0 ? '+' : ''}${summary.change_percentage.toFixed(1)}% change from historical baseline. ${summary.num_changepoints > 0 ? `Detected ${summary.num_changepoints} significant shift${summary.num_changepoints > 1 ? 's' : ''} in engagement pattern.` : 'No major disruptions detected - stable engagement pattern.'}`;

    const getTrendIcon = () => {
      if (trend.trend_direction === 'increasing') return 'up';
      if (trend.trend_direction === 'decreasing') return 'down';
      return 'neutral';
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Engagement Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={summary.total_users.toLocaleString()} 
              label="Total Users" 
              icon={Users} 
              highlight 
            />
            <MetricCard 
              value={`${summary.change_percentage > 0 ? '+' : ''}${summary.change_percentage.toFixed(1)}%`} 
              label="Overall Change" 
              icon={TrendingUp}
              trend={getTrendIcon() as any}
            />
            <MetricCard 
              value={trend.current_value.toFixed(1)} 
              label="Current Level" 
              icon={Activity}
            />
            <MetricCard 
              value={summary.num_changepoints} 
              label="Changepoints" 
              icon={Target}
            />
          </div>

          {/* Detailed Metrics Grid */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Detailed Metrics</h4>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Trend Strength (R²)</p>
                <p className="text-lg font-semibold">
                  {trend.r_squared.toFixed(3)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {trend.r_squared > 0.7 ? 'Strong trend' : trend.r_squared > 0.4 ? 'Moderate trend' : 'Weak trend'}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Volatility</p>
                <p className="text-lg font-semibold">
                  {trend.volatility.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {trend.volatility > 30 ? 'High variance' : trend.volatility > 15 ? 'Moderate variance' : 'Low variance'}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Avg Growth Rate</p>
                <p className="text-lg font-semibold">
                  {trend.avg_growth_rate > 0 ? '+' : ''}{trend.avg_growth_rate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Per period</p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Peak Value</p>
                <p className="text-lg font-semibold">{trend.peak_value.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Maximum observed</p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Trough Value</p>
                <p className="text-lg font-semibold">{trend.trough_value.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Minimum observed</p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Range</p>
                <p className="text-lg font-semibold">
                  {(trend.peak_value - trend.trough_value).toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Peak - Trough</p>
              </div>
            </div>
          </div>

          {/* Historical vs Recent Comparison */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Period Comparison</h4>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Historical Average</p>
                  <Badge variant="outline">Early Periods</Badge>
                </div>
                <p className="text-2xl font-semibold">{trend.historical_avg.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  First half of analysis window
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Recent Average</p>
                  <Badge variant="outline">Recent Periods</Badge>
                </div>
                <p className="text-2xl font-semibold">{trend.recent_avg.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Second half of analysis window
                </p>
              </div>
            </div>
            
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-sm">
                <strong>Change:</strong> Recent periods show {Math.abs(trend.change_percentage).toFixed(1)}% 
                {trend.change_percentage > 0 ? ' increase' : ' decrease'} compared to historical baseline.
                {trend.change_percentage > 0 
                  ? ' Engagement is improving over time.'
                  : trend.change_percentage < -10
                  ? ' Significant decline - investigation recommended.'
                  : ' Slight decline - monitor closely.'}
              </p>
            </div>
          </div>

          {/* Changepoints */}
          {r.changepoints && r.changepoints.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Detected Changepoints</h4>
              <div className="space-y-2">
                {r.changepoints.map((cp, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Period {cp.index}</p>
                        <p className="text-xs text-muted-foreground">
                          Date: {cp.date} | Value: {cp.value.toFixed(1)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Z-score: {cp.z_score.toFixed(2)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Significant deviation from trend ({cp.z_score > 0 ? 'spike' : 'drop'}). 
                      Review product changes, campaigns, or external events during this period.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Insights */}
          {key_insights && key_insights.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Key Insights</h4>
              {key_insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    insight.status === "positive" ? "border-primary/30 bg-primary/5" :
                    insight.status === "warning" ? "border-border bg-muted/10" :
                    "border-border bg-muted/10"
                  }`}
                >
                  {insight.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> :
                   insight.status === "warning" ? <AlertTriangle className="w-5 h-5 text-muted-foreground shrink-0" /> :
                   <Info className="w-5 h-5 text-muted-foreground shrink-0" />}
                  <div>
                    <p className="font-medium text-sm">{insight.title}</p>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DetailParagraph
            title="Analysis Summary"
            detail={`User engagement analysis across ${r.periods_analyzed} ${r.period} periods using ${r.engagement_metric.replace('_', ' ')} metric.

■ Trend Direction: ${trend.trend_direction.charAt(0).toUpperCase() + trend.trend_direction.slice(1)}
Overall engagement is ${trend.trend_direction} with ${Math.abs(trend.change_percentage).toFixed(1)}% ${trend.change_percentage > 0 ? 'increase' : 'decrease'} from historical baseline.
${trend.trend_direction === 'increasing' 
  ? 'Positive momentum indicates successful product improvements, effective campaigns, or growing user base. Recent average (' + trend.recent_avg.toFixed(1) + ') significantly exceeds historical baseline (' + trend.historical_avg.toFixed(1) + ').'
  : trend.trend_direction === 'decreasing'
  ? 'Declining trend requires investigation. Potential causes: product issues, increased competition, seasonal effects, or market saturation. Recent average (' + trend.recent_avg.toFixed(1) + ') below historical baseline (' + trend.historical_avg.toFixed(1) + ').'
  : 'Stable engagement suggests consistent user experience and predictable patterns. Recent average (' + trend.recent_avg.toFixed(1) + ') roughly matches historical baseline (' + trend.historical_avg.toFixed(1) + '). Focus on optimization opportunities.'}

■ Statistical Confidence
Trend strength (R²=${trend.r_squared.toFixed(3)}) ${trend.r_squared > 0.7 ? 'strongly supports' : trend.r_squared > 0.4 ? 'moderately supports' : 'weakly supports'} the ${trend.trend_direction} direction.
${trend.p_value < 0.05 ? 'Trend is statistically significant (p=' + trend.p_value.toFixed(4) + ').' : 'Trend not statistically significant (p=' + trend.p_value.toFixed(4) + ') - monitor for confirmation.'}

Volatility (CV=${trend.volatility.toFixed(1)}%) indicates ${trend.volatility > 30 ? 'high variance - engagement fluctuates significantly' : trend.volatility > 15 ? 'moderate variance - some fluctuation expected' : 'low variance - stable, predictable engagement'}.

■ Actionable Recommendations
${trend.trend_direction === 'increasing'
  ? '• Document recent changes that drove growth for replication\n• Scale successful initiatives and campaigns\n• Monitor sustainability - ensure growth is organic\n• Identify which user segments are driving improvement\n• Consider expanding to similar markets or features'
  : trend.trend_direction === 'decreasing'
  ? '• Immediate investigation of root causes required\n• Review recent product/feature changes for negative impact\n• Conduct user interviews to understand drop-off reasons\n• Implement targeted re-engagement campaigns\n• Compare against competitor activity and market trends\n• Consider A/B testing potential solutions'
  : '• Stable baseline provides opportunity for optimization\n• Test new engagement features with controlled experiments\n• Focus on converting casual users to power users\n• Maintain current positive user experience\n• Look for seasonal patterns to anticipate future trends'
}

${summary.num_changepoints > 0 
  ? '\n■ Changepoint Analysis\n' + summary.num_changepoints + ' significant shift' + (summary.num_changepoints > 1 ? 's' : '') + ' detected. Review product releases, marketing campaigns, competitor actions, or external events during these periods to understand causes.'
  : ''
}`}
          />

          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Methodology = () => {
    if (!results) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-primary" />
            Understanding Engagement Analysis Methodology
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Engagement change analysis uses statistical time series methods to detect trends, identify significant shifts (changepoints), and segment users by activity level. This methodology provides objective, data-driven insights into user behavior patterns." />

          <div className="space-y-4">
            <h4 className="font-medium text-sm">Core Analysis Components</h4>
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Time Period Aggregation</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Raw event data is grouped by time period ({results.results.period}). For each period, 
                      the system calculates {results.results.engagement_metric.replace('_', ' ')} to create a 
                      time series of engagement values.
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground font-mono">
                        {results.results.engagement_metric === 'event_count' 
                          ? 'Metric = COUNT(events per period)'
                          : results.results.engagement_metric === 'active_users'
                          ? 'Metric = COUNT(DISTINCT user_id per period)'
                          : 'Metric = COUNT(events) / COUNT(DISTINCT user_id)'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Linear Trend Detection</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Ordinary Least Squares (OLS) regression identifies overall trend direction. 
                      The model fits: Engagement = Slope × Period + Intercept
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground space-y-1">
                        <strong>R² = {results.results.trend_analysis.r_squared.toFixed(3)}</strong> - 
                        Proportion of variance explained by trend<br/>
                        <strong>Slope = {results.results.trend_analysis.slope.toFixed(3)}</strong> - 
                        Rate of change per period<br/>
                        <strong>P-value = {results.results.trend_analysis.p_value.toFixed(4)}</strong> - 
                        Statistical significance (significant if {'<'} 0.05)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Changepoint Detection</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Statistical Z-score analysis identifies periods with anomalous engagement. 
                      A rolling window calculates local mean and standard deviation.
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground font-mono space-y-1">
                        Z-score = (Value - Rolling_Mean) / Rolling_StdDev<br/>
                        Threshold: |Z-score| {'>'} 2.0 standard deviations<br/>
                        Window size: max(4 periods, {results.results.periods_analyzed} / 4)
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Changepoints indicate statistically significant deviations from expected engagement levels.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                    4
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">User Segmentation</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Users are ranked by total engagement across all periods and divided into quartiles. 
                      This identifies power users, regular users, casual users, and low-engagement users.
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground space-y-1">
                        <strong>Power Users (Top 25%):</strong> Total engagement ≥ 75th percentile<br/>
                        <strong>Regular Users (25-50%):</strong> Between 50th and 75th percentile<br/>
                        <strong>Casual Users (50-75%):</strong> Between 25th and 50th percentile<br/>
                        <strong>Low Engagement (Bottom 25%):</strong> Below 25th percentile
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <DetailParagraph
            title="Statistical Measures Explained"
            detail={`■ Trend Direction
Linear regression determines if engagement is increasing, decreasing, or stable over time.
Slope > 0: Increasing trend (engagement growing)
Slope < 0: Decreasing trend (engagement declining)  
Slope ≈ 0: Stable trend (no significant change)

■ Trend Strength (R²)
R² measures how well the linear model explains engagement variance.
R² > 0.7: Strong trend - most variance explained by time
R² 0.4-0.7: Moderate trend - clear direction with some noise
R² < 0.4: Weak trend - engagement is noisy or non-linear

■ Volatility (Coefficient of Variation)
CV = (Standard Deviation / Mean) × 100
Measures relative variability in engagement across periods.
CV < 15%: Low volatility - stable, predictable engagement
CV 15-30%: Moderate volatility - some fluctuation expected
CV > 30%: High volatility - significant period-to-period variation

■ Growth Rate
Period-over-period percentage change, averaged across all periods.
Indicates acceleration (positive) or deceleration (negative) of engagement.

■ Historical vs Recent Comparison
Data split at midpoint. Recent average compared to historical baseline.
Positive change: Recent periods show improvement
Negative change: Recent periods show decline
Helps identify if trend is accelerating or reversing`}
          />

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Practical Application Guide</h4>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">1. Establish Baseline</p>
                <p className="text-xs text-muted-foreground">
                  Run analysis on historical data to understand normal engagement patterns. 
                  Note seasonal variations, typical growth rates, and volatility levels.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">2. Monitor Regularly</p>
                <p className="text-xs text-muted-foreground">
                  Re-run analysis {results.results.period === 'weekly' ? 'weekly' : results.results.period === 'monthly' ? 'monthly' : 'regularly'} to 
                  track changes. Look for deviations from baseline trend and investigate causes.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">3. Investigate Changepoints</p>
                <p className="text-xs text-muted-foreground">
                  When changepoints detected, correlate with product releases, marketing campaigns, 
                  competitor actions, or external events. Document learnings.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">4. Segment Analysis</p>
                <p className="text-xs text-muted-foreground">
                  Analyze trends separately for different user segments. Power users may show different 
                  patterns than casual users. Target interventions accordingly.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">5. Validate with A/B Tests</p>
                <p className="text-xs text-muted-foreground">
                  Observed trends suggest hypotheses. Test causal relationships with controlled experiments 
                  before making major strategic decisions.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Interpretation Best Practices</h4>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm mb-1">✓ Do Consider</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Seasonality and calendar effects</li>
                  <li>• Recent product/marketing changes</li>
                  <li>• External market factors</li>
                  <li>• Data quality and completeness</li>
                  <li>• User base growth/churn</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">✗ Don't Assume</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Correlation implies causation</li>
                  <li>• Past trends predict future perfectly</li>
                  <li>• All user segments behave identically</li>
                  <li>• Short-term fluctuations are meaningful</li>
                  <li>• Single metric tells complete story</li>
                </ul>
              </div>
            </div>
          </div>

          <Card className="border-border bg-muted/10">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm mb-2">Methodology Limitations</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Linear assumption:</strong> Trend detection assumes linear relationships. Non-linear patterns may not be fully captured.</li>
                    <li>• <strong>Window dependency:</strong> Lookback period ({results.results.periods_analyzed} {results.results.period} periods) affects results. Shorter windows miss long-term trends, longer windows dilute recent changes.</li>
                    <li>• <strong>Changepoint sensitivity:</strong> Z-score threshold of 2.0 balances detection vs false positives. Lower thresholds find more changepoints but increase false alarms.</li>
                    <li>• <strong>Segmentation stability:</strong> User segments based on total engagement may shift as user behavior evolves.</li>
                    <li>• <strong>Causality:</strong> Analysis identifies correlations and patterns but cannot prove causation without controlled experiments.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">
              View Full Report <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => {
    if (!results) return null;

    const { visualizations, results: r, key_insights, summary } = results;
    const segments = r.segment_distribution;
    const trend = r.trend_analysis;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Engagement Change Analysis Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {r.engagement_metric.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} | {r.period} | {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <MetricCard value={summary.total_users.toLocaleString()} label="Users" highlight />
              <MetricCard value={summary.total_events.toLocaleString()} label="Events" />
              <MetricCard value={`${summary.change_percentage > 0 ? '+' : ''}${summary.change_percentage.toFixed(1)}%`} label="Change" />
              <MetricCard value={trend.current_value.toFixed(1)} label="Current" />
              <MetricCard value={r.periods_analyzed} label="Periods" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Engagement analysis of {summary.total_users.toLocaleString()} users generating {summary.total_events.toLocaleString()} events 
              across {r.periods_analyzed} {r.period} periods. Overall trend is <strong>{summary.trend_direction}</strong> with{' '}
              {Math.abs(summary.change_percentage).toFixed(1)}% {summary.change_percentage > 0 ? 'increase' : 'decrease'} from historical baseline.
              {trend.r_squared > 0.7 
                ? ' Strong statistical trend (R²=' + trend.r_squared.toFixed(3) + ') provides high confidence in direction.'
                : trend.r_squared > 0.4
                ? ' Moderate trend strength (R²=' + trend.r_squared.toFixed(3) + ') indicates general direction with some variance.'
                : ' Weak trend (R²=' + trend.r_squared.toFixed(3) + ') suggests engagement is relatively stable or noisy.'
              }
              {summary.num_changepoints > 0 && (
                ' ' + summary.num_changepoints + ' significant changepoint' + (summary.num_changepoints > 1 ? 's' : '') + ' detected, indicating notable shifts in user behavior.'
              )}
            </p>
          </CardContent>
        </Card>

        {/* Key Insights */}
        {key_insights && key_insights.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Key Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {key_insights.map((ins, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    ins.status === "warning" ? "border-border bg-muted/10" :
                    ins.status === "positive" ? "border-primary/30 bg-primary/5" :
                    "border-border bg-muted/10"
                  }`}
                >
                  {ins.status === "warning" ? <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" /> :
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
        )}

        {/* Trend Analysis Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trend Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground mb-1">Direction</p>
                  <p className="text-lg font-semibold capitalize">{trend.trend_direction}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground mb-1">Strength (R²)</p>
                  <p className="text-lg font-semibold">{trend.r_squared.toFixed(3)}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground mb-1">Slope</p>
                  <p className="text-lg font-semibold">{trend.slope > 0 ? '+' : ''}{trend.slope.toFixed(3)}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground mb-1">Historical Avg</p>
                  <p className="text-lg font-semibold">{trend.historical_avg.toFixed(1)}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground mb-1">Recent Avg</p>
                  <p className="text-lg font-semibold">{trend.recent_avg.toFixed(1)}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground mb-1">Volatility (CV)</p>
                  <p className="text-lg font-semibold">{trend.volatility.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <h4 className="font-medium text-sm mb-2">Statistical Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Current:</span> <strong>{trend.current_value.toFixed(1)}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Peak:</span> <strong>{trend.peak_value.toFixed(1)}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Trough:</span> <strong>{trend.trough_value.toFixed(1)}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">P-value:</span> <strong>{trend.p_value.toFixed(4)}</strong>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visualizations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Visualizations</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
              <TabsList className="mb-4 flex-wrap">
                {visualizations.trend_line && <TabsTrigger value="trend_line" className="text-xs">Trend Line</TabsTrigger>}
                {visualizations.growth_rate && <TabsTrigger value="growth_rate" className="text-xs">Growth Rate</TabsTrigger>}
                {visualizations.moving_average && <TabsTrigger value="moving_average" className="text-xs">Moving Avg</TabsTrigger>}
                {visualizations.segmentation && <TabsTrigger value="segmentation" className="text-xs">Segments</TabsTrigger>}
                {visualizations.distribution && <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>}
              </TabsList>
              {Object.entries(visualizations).map(([key, value]) =>
                value && (
                  <TabsContent key={key} value={key}>
                    <div className="relative border border-border rounded-lg overflow-hidden">
                      <img src={`data:image/png;base64,${value}`} alt={key} className="w-full" />
                      <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(key)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TabsContent>
                )
              )}
            </Tabs>
          </CardContent>
        </Card>

        {/* User Segmentation */}
        {segments && Object.keys(segments).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">User Segmentation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(segments).sort((a, b) => b[1] - a[1]).map(([segment, count]) => (
                  <div key={segment} className="p-3 rounded-lg border border-border bg-muted/10">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">{segment}</p>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                    <p className="text-2xl font-semibold">{count}</p>
                    <p className="text-xs text-muted-foreground">
                      {((count / Object.values(segments).reduce((a, b) => a + b, 0)) * 100).toFixed(1)}% of users
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  <strong>Segmentation Method:</strong> Users ranked by total engagement and divided into quartiles. 
                  Power users (top 25%) drive most activity, while low engagement users (bottom 25%) may need re-activation campaigns.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Changepoint Details */}
        {r.changepoints && r.changepoints.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Changepoint Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Z-Score</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.changepoints.map((cp, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">Period {cp.index}</TableCell>
                      <TableCell className="text-sm">{cp.date}</TableCell>
                      <TableCell className="text-right font-mono">{cp.value.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono">{cp.z_score.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {cp.z_score > 0 ? 'Spike' : 'Drop'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-3">
                Changepoints detected using statistical Z-score analysis (threshold: 2.0 std deviations). 
                Review product releases, marketing campaigns, or external events during these periods.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Immediate Actions</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {trend.trend_direction === 'increasing' ? (
                    <>
                      <li>• Document recent changes that drove {Math.abs(trend.change_percentage).toFixed(1)}% growth</li>
                      <li>• Scale successful campaigns and product features</li>
                      <li>• Monitor for sustainability - ensure growth is organic</li>
                      <li>• Analyze which user segments are driving improvement</li>
                    </>
                  ) : trend.trend_direction === 'decreasing' ? (
                    <>
                      <li>• Investigate root cause of {Math.abs(trend.change_percentage).toFixed(1)}% decline immediately</li>
                      <li>• Review recent product changes for negative impact</li>
                      <li>• Conduct user interviews to understand drop-off</li>
                      <li>• Implement targeted re-engagement campaigns</li>
                      <li>• Compare against competitor activity</li>
                    </>
                  ) : (
                    <>
                      <li>• Optimize existing features for better engagement</li>
                      <li>• Test new engagement mechanics with A/B tests</li>
                      <li>• Focus on converting casual users to regular users</li>
                      <li>• Maintain current stable user experience</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Long-term Strategy</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Run engagement analysis {r.period === 'weekly' ? 'weekly' : 'monthly'} to track trends</li>
                  <li>• Build predictive models based on historical patterns</li>
                  <li>• Segment by acquisition channel for targeted optimization</li>
                  <li>• Monitor seasonal patterns for proactive planning</li>
                  <li>• Set up automated alerts for significant changes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              Analysis Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This engagement analysis identifies statistical trends and patterns in user behavior. Results assume 
                consistent tracking methodology and representative sampling. Engagement changes may be influenced by 
                seasonality, marketing campaigns, product updates, competitor actions, or external market factors. 
                Changepoint detection uses Z-score threshold of 2.0 standard deviations. Always validate insights through 
                additional analysis and controlled experiments before making major strategic decisions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(visualizations).map(([key, value]) =>
                value && (
                  <Button key={key} variant="outline" onClick={() => handleDownloadPNG(key)} className="gap-2">
                    <Download className="w-4 h-4" />
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(5)}>Back to Methodology</Button>
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Analysis</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {currentStep > 1 && (
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="sm" onClick={() => setShowGuide(true)} className="gap-2">
            <BookOpen className="w-4 h-4" />Guide
          </Button>
        </div>
      )}
      
      <EngagementGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
      
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
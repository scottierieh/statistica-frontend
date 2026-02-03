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
  Target, Percent, Tag, Sparkles, AlertTriangle, BookMarked, Zap, Users, Award
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface RFMResult {
  success: boolean;
  results: {
    metrics: {
      total_customers: number;
      total_revenue: number;
      avg_recency_days: number;
      avg_frequency: number;
      avg_monetary: number;
      champions_count: number;
      loyal_count: number;
      at_risk_count: number;
      lost_count: number;
      top_segment: string;
      top_segment_revenue: number;
      top_segment_revenue_pct: number;
    };
    segment_summary: Array<{
      segment: string;
      customer_count: number;
      avg_recency: number;
      avg_frequency: number;
      avg_monetary: number;
      total_revenue: number;
      avg_score: number;
      customer_pct: number;
      revenue_pct: number;
    }>;
    customer_segments: Array<{
      [key: string]: any;
      R_Score: number;
      F_Score: number;
      M_Score: number;
      RFM_Score: string;
      Total_Score: number;
      Segment: string;
    }>;
    rfm_statistics: {
      recency: { mean: number; median: number; min: number; max: number };
      frequency: { mean: number; median: number; min: number; max: number };
      monetary: { mean: number; median: number; min: number; max: number };
    };
  };
  visualizations: {
    segment_distribution?: string;
    revenue_by_segment?: string;
    rfm_heatmap?: string;
    rfm_distribution?: string;
    segment_comparison?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    total_customers: number;
    total_segments: number;
    top_segment: string;
  };
}

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  
  for (let i = 1; i <= 500; i++) {
    // Create realistic customer segments with Pareto distribution
    const customerType = Math.random();
    
    let recency: number;
    let frequency: number;
    let monetary: number;
    
    if (customerType < 0.15) {
      // Champions (15%): Recent, frequent, high-value
      recency = Math.floor(Math.random() * 30) + 1;
      frequency = Math.floor(Math.random() * 30) + 20;
      monetary = parseFloat((Math.random() * 3000 + 2000).toFixed(2));
    } else if (customerType < 0.30) {
      // Loyal/Potential Loyalists (15%): Good but not best
      recency = Math.floor(Math.random() * 60) + 20;
      frequency = Math.floor(Math.random() * 20) + 10;
      monetary = parseFloat((Math.random() * 1500 + 800).toFixed(2));
    } else if (customerType < 0.50) {
      // Active/Promising (20%): Recent but developing
      recency = Math.floor(Math.random() * 45) + 1;
      frequency = Math.floor(Math.random() * 10) + 3;
      monetary = parseFloat((Math.random() * 800 + 200).toFixed(2));
    } else if (customerType < 0.70) {
      // Need Attention (20%): Average across board
      recency = Math.floor(Math.random() * 120) + 60;
      frequency = Math.floor(Math.random() * 8) + 2;
      monetary = parseFloat((Math.random() * 600 + 100).toFixed(2));
    } else if (customerType < 0.85) {
      // At Risk/Hibernating (15%): Once good, now slipping
      recency = Math.floor(Math.random() * 150) + 120;
      frequency = Math.floor(Math.random() * 15) + 8;
      monetary = parseFloat((Math.random() * 1200 + 500).toFixed(2));
    } else {
      // Lost/Inactive (15%): Poor on all dimensions
      recency = Math.floor(Math.random() * 180) + 180;
      frequency = Math.floor(Math.random() * 3) + 1;
      monetary = parseFloat((Math.random() * 200 + 10).toFixed(2));
    }
    
    data.push({
      customer_id: `CUST_${String(i).padStart(4, '0')}`,
      recency_days: recency,
      purchase_count: frequency,
      total_spend: monetary
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
    a.download = 'rfm_source_data.csv';
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
            <h2 className="text-lg font-semibold">RFM Segmentation Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is RFM Segmentation?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              RFM (Recency, Frequency, Monetary) analysis segments customers based on purchase behavior patterns. 
              It assigns scores (1-5) for each dimension using quintile-based ranking, then combines these scores 
              to classify customers into actionable segments for targeted marketing and retention strategies.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              RFM Scoring Method
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Recency (R)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Definition:</strong> Days since last purchase<br/>
                  <strong>Scoring:</strong> 5 = Most recent (best), 1 = Least recent (worst)<br/>
                  <strong>Method:</strong> Quintile-based ranking (lower days = higher score)
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Frequency (F)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Definition:</strong> Total number of purchases<br/>
                  <strong>Scoring:</strong> 5 = Highest frequency (best), 1 = Lowest (worst)<br/>
                  <strong>Method:</strong> Quintile-based ranking (more purchases = higher score)
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Monetary (M)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Definition:</strong> Total spending amount<br/>
                  <strong>Scoring:</strong> 5 = Highest spending (best), 1 = Lowest (worst)<br/>
                  <strong>Method:</strong> Quintile-based ranking (more spending = higher score)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Customer Segments (10 Types)
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary">Champions</p>
                <p className="text-xs text-muted-foreground mt-1">
                  R≥4, F≥4, M≥4 → Best customers. Recent, frequent, high spenders.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary">Loyal Customers</p>
                <p className="text-xs text-muted-foreground mt-1">
                  F≥4, M≥4 → High value, frequent buyers. Maintain engagement.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary">Potential Loyalists</p>
                <p className="text-xs text-muted-foreground mt-1">
                  R≥4, F≥3, M≥3 → Recent with potential. Nurture into champions.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary">New Customers</p>
                <p className="text-xs text-muted-foreground mt-1">
                  R≥4, F≤2 → Recent but low frequency. Onboard effectively.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-red-600 dark:text-red-400">At Risk</p>
                <p className="text-xs text-muted-foreground mt-1">
                  R≤2, F≥3, M≥3 → High spenders slipping away. Win-back urgently.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-red-600 dark:text-red-400">Can't Lose Them</p>
                <p className="text-xs text-muted-foreground mt-1">
                  R≤2, F≥4, M≥4 → Top customers going inactive. Critical retention.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-orange-600 dark:text-orange-400">Hibernating</p>
                <p className="text-xs text-muted-foreground mt-1">
                  R≤2, F≥2, M≥2 → Once active, now dormant. Re-engagement needed.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-orange-600 dark:text-orange-400">Lost</p>
                <p className="text-xs text-muted-foreground mt-1">
                  R≤2, F≤2 → Inactive, low engagement. Minimal investment.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-blue-600 dark:text-blue-400">Promising</p>
                <p className="text-xs text-muted-foreground mt-1">
                  R≥3, F≤2, M≤2 → Recent but need nurturing. Growth potential.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Need Attention</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Other combinations → Below average. Targeted campaigns.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Strategic Actions by Segment
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Champions & Loyal</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Action:</strong> Reward loyalty → VIP programs, early access, exclusive offers, referral incentives
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">At Risk & Can't Lose Them</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Action:</strong> Win-back campaigns → Personalized offers, surveys, limited-time discounts
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">New & Promising</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Action:</strong> Onboarding & nurture → Welcome series, product education, first purchase incentives
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Hibernating & Lost</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Action:</strong> Re-engagement or sunset → Targeted reactivation, or remove from active campaigns
                </p>
              </div>
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
                  <li>• 100+ customers minimum</li>
                  <li>• 6-12 months transaction history</li>
                  <li>• Clean data (no duplicates)</li>
                  <li>• Standardized date formats</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Implementation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Update monthly or quarterly</li>
                  <li>• A/B test segment strategies</li>
                  <li>• Track segment migration</li>
                  <li>• Personalize by segment</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> RFM segmentation is a starting point for customer strategy. 
              Combine with demographic data, behavioral analytics, and product preferences for comprehensive customer understanding.
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
          <Users className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">RFM Customer Segmentation</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Segment customers based on purchase behavior patterns using Recency, Frequency, and Monetary analysis. 
          Identify high-value segments, at-risk customers, and growth opportunities for targeted marketing strategies.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Behavior-Based Scoring</p>
              <p className="text-xs text-muted-foreground">Quintile ranking (1-5)</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">10 Customer Segments</p>
              <p className="text-xs text-muted-foreground">Actionable categories</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Strategic Recommendations</p>
              <p className="text-xs text-muted-foreground">Segment-specific actions</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use RFM Segmentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Customer ID column",
                  "Recency (days since last purchase)",
                  "Frequency (number of purchases)",
                  "Monetary (total spending amount)",
                  "100+ customers recommended"
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
                  "Customer-level RFM scores (1-5)",
                  "10 strategic segment classifications",
                  "Revenue contribution by segment",
                  "At-risk customer identification",
                  "Targeted marketing recommendations"
                ].map((res) => (
                  <li key={res} className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
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

export default function RFMSegmentationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<RFMResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const [customerIdCol, setCustomerIdCol] = useState<string>("");
  const [recencyCol, setRecencyCol] = useState<string>("");
  const [frequencyCol, setFrequencyCol] = useState<string>("");
  const [monetaryCol, setMonetaryCol] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setCustomerIdCol("customer_id");
    setRecencyCol("recency_days");
    setFrequencyCol("purchase_count");
    setMonetaryCol("total_spend");
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
          ? `${data.length.toLocaleString()} customers loaded` 
          : "No data loaded"
      },
      {
        name: "Customer ID Column",
        passed: !!customerIdCol,
        message: customerIdCol 
          ? `Using: ${customerIdCol}` 
          : "Select customer ID column"
      },
      {
        name: "Recency Column",
        passed: !!recencyCol,
        message: recencyCol 
          ? `Using: ${recencyCol}` 
          : "Select recency column"
      },
      {
        name: "Frequency Column",
        passed: !!frequencyCol,
        message: frequencyCol 
          ? `Using: ${frequencyCol}` 
          : "Select frequency column"
      },
      {
        name: "Monetary Column",
        passed: !!monetaryCol,
        message: monetaryCol 
          ? `Using: ${monetaryCol}` 
          : "Select monetary column"
      }
    ];
    
    if (customerIdCol && recencyCol && frequencyCol && monetaryCol) {
      checks.push({
        name: "Sufficient Data",
        passed: data.length >= 10,
        message: data.length >= 100
          ? `${data.length} customers (excellent)`
          : data.length >= 10
          ? `${data.length} customers (acceptable)`
          : `Only ${data.length} customers (need ≥10)`
      });
    }
    
    return checks;
  }, [data, customerIdCol, recencyCol, frequencyCol, monetaryCol]);

  const runSegmentation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        customer_id_col: customerIdCol,
        recency_col: recencyCol,
        frequency_col: frequencyCol,
        monetary_col: monetaryCol
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/rfm-segmentation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: RFMResult = await res.json();
      setResults(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Configuration
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Analysis Parameters
        </CardTitle>
        <CardDescription>Select RFM data columns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Customer ID *</Label>
            <Select value={customerIdCol || "__none__"} onValueChange={v => setCustomerIdCol(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-- Select --</SelectItem>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Recency (days) *</Label>
            <Select value={recencyCol || "__none__"} onValueChange={v => setRecencyCol(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
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

          <div className="space-y-2">
            <Label>Frequency (count) *</Label>
            <Select value={frequencyCol || "__none__"} onValueChange={v => setFrequencyCol(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
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

          <div className="space-y-2">
            <Label>Monetary (total $) *</Label>
            <Select value={monetaryCol || "__none__"} onValueChange={v => setMonetaryCol(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
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

        <div className="flex justify-end pt-4">
          <Button onClick={() => setCurrentStep(3)} className="gap-2">
            Continue to Validation
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Step 3: Validation
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
            <Button onClick={runSegmentation} disabled={loading || !canRun} className="gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Segmenting...
                </>
              ) : (
                <>
                  Run Segmentation
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 4: Summary (LTV format)
  const renderStep4Summary = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights } = results;
    const metrics = r.metrics;
    const segments = r.segment_summary.sort((a, b) => b.total_revenue - a.total_revenue);

    const finding = `Analysis of ${summary.total_customers.toLocaleString()} customers across ${summary.total_segments} behavioral segments reveals total revenue of $${metrics.total_revenue.toLocaleString()}. The ${metrics.top_segment} segment contributes ${metrics.top_segment_revenue_pct.toFixed(1)}% of total revenue with ${metrics.champions_count} champions and ${metrics.loyal_count} loyal customers representing the highest-value groups.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            RFM Segmentation Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              value={summary.total_customers.toLocaleString()}
              label="Total Customers"
              icon={Users}
              highlight
            />
            <MetricCard
              value={`$${(metrics.total_revenue / 1000).toFixed(0)}K`}
              label="Total Revenue"
              icon={DollarSign}
            />
            <MetricCard
              value={summary.total_segments}
              label="Active Segments"
              icon={Target}
            />
            <MetricCard
              value={metrics.champions_count}
              label="Champions"
              icon={Award}
            />
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Top Segments by Revenue</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {segments.slice(0, 4).map((seg) => (
                <div
                  key={seg.segment}
                  className="rounded-lg p-4 border border-border bg-muted/10"
                >
                  <Users className="w-5 h-5 text-primary mb-2" />
                  <p className="text-sm font-medium">{seg.segment}</p>
                  <p className="text-2xl font-semibold">{seg.customer_count}</p>
                  <p className="text-xs text-muted-foreground">
                    ${(seg.total_revenue / 1000).toFixed(0)}K revenue ({seg.revenue_pct.toFixed(1)}%)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    R:{seg.avg_recency.toFixed(0)}d F:{seg.avg_frequency.toFixed(1)} M:${seg.avg_monetary.toFixed(0)}
                  </p>
                </div>
              ))}
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
            detail={`This RFM segmentation analysis classifies customers into behavioral groups based on purchasing patterns.

■ Total Customers & Revenue: ${summary.total_customers.toLocaleString()} customers, $${metrics.total_revenue.toLocaleString()}
The customer base is distributed across ${summary.total_segments} active segments, enabling targeted marketing strategies. Total historical revenue provides baseline for evaluating segment value.

■ Top Segment: ${metrics.top_segment} (${metrics.top_segment_revenue_pct.toFixed(1)}% of revenue)
${metrics.top_segment_revenue_pct > 40 
  ? `High revenue concentration in ${metrics.top_segment} indicates strong dependency on this segment. Prioritize retention efforts to protect this critical revenue source.`
  : `Balanced revenue distribution across segments suggests lower concentration risk and a diversified customer base.`}

■ High-Value Segments
• Champions: ${metrics.champions_count} customers (R≥4, F≥4, M≥4)
• Loyal Customers: ${metrics.loyal_count} customers (F≥4, M≥4)
These segments represent your best customers with recent purchases, high frequency, and strong spending. Focus retention and VIP programs here.

■ At-Risk Segments  
• At Risk: ${metrics.at_risk_count} customers (R≤2, F≥3, M≥3)
• Lost: ${metrics.lost_count} customers (R≤2, F≤2)
${metrics.at_risk_count > 0 || metrics.lost_count > 0
  ? `${metrics.at_risk_count + metrics.lost_count} customers require immediate win-back campaigns to prevent further revenue erosion.`
  : `Minimal at-risk customers indicate strong customer engagement and retention.`}

■ Segment Distribution Insights
${segments.slice(0, 3).map(s => 
  `• ${s.segment}: ${s.customer_count} customers (${s.customer_pct.toFixed(1)}% of base, ${s.revenue_pct.toFixed(1)}% of revenue)`
).join('\n')}

${(segments[0]?.revenue_pct || 0) + (segments[1]?.revenue_pct || 0) > 60
  ? 'Top two segments account for >60% of revenue, following Pareto principle. Protect these segments with dedicated retention strategies.'
  : 'Revenue is well-distributed across segments, reducing dependency risk on any single customer group.'}`}
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

  // Continuing in next message due to length...
  // Step 5: Methodology (LTV format)
  const renderStep5Methodology = () => {
    if (!results) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-primary" />
            Methodology & Strategic Framework
          </CardTitle>
          <CardDescription>
            Understanding RFM scoring and segment-specific strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-medium">Quintile Scoring</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Method:</strong> 5 equal groups (quintiles)</p>
                <p>• <strong>R Score:</strong> 5 = most recent (best)</p>
                <p>• <strong>F Score:</strong> 5 = highest frequency</p>
                <p>• <strong>M Score:</strong> 5 = highest spending</p>
                <p>• <strong>Total:</strong> Sum of R + F + M (3-15)</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-medium">RFM Statistics</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Avg Recency:</strong> {results.results.metrics.avg_recency_days.toFixed(0)} days</p>
                <p>• <strong>Avg Frequency:</strong> {results.results.metrics.avg_frequency.toFixed(1)} purchases</p>
                <p>• <strong>Avg Monetary:</strong> ${results.results.metrics.avg_monetary.toFixed(2)}</p>
                <p>• <strong>Median R:</strong> {results.results.rfm_statistics.recency.median.toFixed(0)} days</p>
                <p>• <strong>Median F:</strong> {results.results.rfm_statistics.frequency.median.toFixed(0)} purchases</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-medium">Segment Logic</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Champions:</strong> R≥4, F≥4, M≥4</p>
                <p>• <strong>Loyal:</strong> F≥4, M≥4 (any R)</p>
                <p>• <strong>At Risk:</strong> R≤2, F≥3, M≥3</p>
                <p>• <strong>Lost:</strong> R≤2, F≤2 (any M)</p>
                <p>• 10 total segments with specific rules</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-medium">Key Segments</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Champions:</strong> {results.results.metrics.champions_count} customers</p>
                <p>• <strong>Loyal:</strong> {results.results.metrics.loyal_count} customers</p>
                <p>• <strong>At Risk:</strong> {results.results.metrics.at_risk_count} customers</p>
                <p>• <strong>Lost:</strong> {results.results.metrics.lost_count} customers</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-medium mb-3">Strategic Framework by Segment</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-primary" />
                  <h4 className="font-medium text-sm">Champions & Loyal Customers (Protect & Grow)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Action Required:</strong> Reward loyalty, maximize lifetime value
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• <strong>VIP Programs:</strong> Exclusive tiers with premium benefits</p>
                  <p>• <strong>Early Access:</strong> New products 2 weeks before public launch</p>
                  <p>• <strong>Referral Bonuses:</strong> $50 credit for each successful referral</p>
                  <p>• <strong>Anniversary Rewards:</strong> Special offers on customer anniversary</p>
                  <p>• <strong>Dedicated Support:</strong> Priority customer service, account managers</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-red-600/30 bg-red-600/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h4 className="font-medium text-sm">At Risk & Can't Lose Them (Urgent Retention)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Action Required:</strong> Win-back campaigns, prevent churn
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• <strong>Win-Back Offers:</strong> 20-30% discount on next purchase</p>
                  <p>• <strong>Satisfaction Surveys:</strong> Understand reasons for disengagement</p>
                  <p>• <strong>Personal Outreach:</strong> Phone calls from account managers</p>
                  <p>• <strong>Limited-Time Deals:</strong> Expiring offers to create urgency</p>
                  <p>• <strong>Product Updates:</strong> Show new features since last purchase</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-blue-600/30 bg-blue-600/5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-sm">New, Promising & Potential Loyalists (Nurture & Convert)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Action Required:</strong> Onboarding, engagement, conversion
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• <strong>Welcome Series:</strong> 3-5 email onboarding sequence</p>
                  <p>• <strong>Educational Content:</strong> Product guides, how-tos, best practices</p>
                  <p>• <strong>First Purchase Bonus:</strong> 10-15% off second purchase</p>
                  <p>• <strong>Loyalty Enrollment:</strong> Automatic signup with bonus points</p>
                  <p>• <strong>Engagement Campaigns:</strong> Interactive content, use case examples</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-muted-foreground" />
                  <h4 className="font-medium text-sm">Hibernating, Lost & Need Attention (Minimal Investment)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Action Required:</strong> Low-cost reactivation or sunset
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• <strong>Last-Chance Offers:</strong> Final attempt before removal</p>
                  <p>• <strong>Product Announcements:</strong> Updates on major new features</p>
                  <p>• <strong>Re-subscription Incentives:</strong> Discounted return offers</p>
                  <p>• <strong>Feedback Requests:</strong> "Why did you stop?" surveys</p>
                  <p>• <strong>Sunset Strategy:</strong> Remove from active campaigns if no response</p>
                </div>
              </div>
            </div>
          </div>

          <DetailParagraph
            title="Implementation Guidance"
            detail={`RFM segmentation enables data-driven customer marketing through behavioral classification:

1. Immediate Priorities (Week 1)
   - Extract Champions & Loyal customers for VIP program enrollment
   - Launch win-back campaigns for At Risk & Can't Lose Them segments
   - Design welcome sequences for New Customers

2. Campaign Development (Week 2-4)
   - Create segment-specific email templates and offer structures
   - Set up automated triggers based on RFM score changes
   - Define success metrics: retention rate, revenue per segment, migration patterns

3. Ongoing Optimization (Monthly)
   - Re-calculate RFM scores to track segment migration
   - A/B test messaging and offers within each segment
   - Measure campaign ROI by segment
   - Adjust strategies based on performance data

4. Advanced Applications
   - Combine RFM with demographic data for micro-segmentation
   - Use segment trends to predict future behavior
   - Set revenue targets per segment
   - Develop segment-specific product recommendations

Success Metrics:
• Retention Rate: 85%+ for Champions/Loyal, 60%+ for At Risk
• Revenue Growth: 15-25% increase in top segment value
• Campaign Response: 20%+ for targeted offers vs 5% for generic
• Customer Migration: Track upward movement to higher-value segments`}
          />

          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(6)} className="gap-2">
              View Full Report
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 6: Report (LTV format)
  const renderStep6Report = () => {
    if (!results) return null;

    const { summary, results: r, key_insights, visualizations } = results;
    const segments = r.segment_summary.sort((a, b) => b.total_revenue - a.total_revenue);

    const handleDownloadCSV = () => {
      const customers = r.customer_segments;
      const headers = ['customer_id', 'R_Score', 'F_Score', 'M_Score', 'RFM_Score', 'Total_Score', 'Segment'];
      const csv = [
        headers.join(','),
        ...customers.map(c => [
          c[customerIdCol],
          c.R_Score,
          c.F_Score,
          c.M_Score,
          c.RFM_Score,
          c.Total_Score,
          c.Segment
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'rfm_customer_segments.csv';
      a.click();
    };

    const handleDownloadPNG = (key: string) => {
      const value = visualizations[key as keyof typeof visualizations];
      if (!value) return;
      
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${value}`;
      link.download = `rfm_${key}.png`;
      link.click();
    };

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">RFM Customer Segmentation Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Behavioral Analysis | {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={summary.total_customers.toLocaleString()} label="Customers" highlight />
              <MetricCard value={`$${(r.metrics.total_revenue / 1000).toFixed(0)}K`} label="Total Revenue" />
              <MetricCard value={summary.total_segments} label="Active Segments" />
              <MetricCard value={r.metrics.champions_count} label="Champions" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              RFM segmentation analysis was performed on {summary.total_customers.toLocaleString()} customers
              using quintile-based scoring. Customers are distributed across {summary.total_segments} behavioral segments
              with total revenue of ${r.metrics.total_revenue.toLocaleString()}. The {r.metrics.top_segment} segment
              leads with ${r.metrics.top_segment_revenue_pct.toFixed(1)}% of total revenue.
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
                {visualizations.segment_distribution && <TabsTrigger value="segment_distribution" className="text-xs">Segment Distribution</TabsTrigger>}
                {visualizations.revenue_by_segment && <TabsTrigger value="revenue_by_segment" className="text-xs">Revenue</TabsTrigger>}
                {visualizations.rfm_heatmap && <TabsTrigger value="rfm_heatmap" className="text-xs">Heatmap</TabsTrigger>}
                {visualizations.rfm_distribution && <TabsTrigger value="rfm_distribution" className="text-xs">RFM Distribution</TabsTrigger>}
                {visualizations.segment_comparison && <TabsTrigger value="segment_comparison" className="text-xs">Comparison</TabsTrigger>}
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
            <CardTitle className="text-base">Segment Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Avg RFM</TableHead>
                  <TableHead className="text-right">% of Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map((seg) => (
                  <TableRow key={seg.segment}>
                    <TableCell className="font-medium">{seg.segment}</TableCell>
                    <TableCell className="text-right">{seg.customer_count}</TableCell>
                    <TableCell className="text-right">${seg.total_revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      R:{seg.avg_recency.toFixed(0)} F:{seg.avg_frequency.toFixed(1)} M:${seg.avg_monetary.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-right">{seg.revenue_pct.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customer Segments (Sample)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">RFM Score</TableHead>
                  <TableHead className="text-right">Total Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.customer_segments.slice(0, 10).map((c, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{c[customerIdCol]}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{c.Segment}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{c.RFM_Score}</TableCell>
                    <TableCell className="text-right">{c.Total_Score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {r.customer_segments.length > 10 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Showing first 10 of {r.customer_segments.length.toLocaleString()} customers
              </p>
            )}
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
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2">
                <FileText className="w-4 h-4" />
                CSV (All Segments)
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
                This report is a decision-making support tool derived from statistical segmentation algorithms. 
                The analysis provides behavioral classifications based on historical purchase data; actual customer value 
                may vary depending on market conditions and business context. This information does not guarantee 
                specific outcomes, and the final responsibility for any marketing decisions rests solely with the user.
              </p>
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
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Filter, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  ChevronDown, Users, Target, BarChart3, Percent, ArrowDown,
  Clock, MousePointer, ShoppingCart, CreditCard, UserCheck,
  Eye, LogIn, FileCheck, Send, TrendingDown, AlertTriangle
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface StageMetrics {
  stage_name: string;
  users: number;
  conversion_rate: number;
  drop_off_rate: number;
  drop_off_count: number;
  cumulative_conversion: number;
  avg_time_in_stage?: number;
  median_time_in_stage?: number;
}

interface FunnelAnalysisResult {
  success: boolean;
  results: {
    stage_metrics: StageMetrics[];
    overall_conversion: number;
    total_users: number;
    total_converted: number;
    biggest_drop_off: {
      stage: string;
      drop_off_rate: number;
      drop_off_count: number;
    };
    segment_analysis?: {
      [segment: string]: {
        stages: StageMetrics[];
        overall_conversion: number;
      };
    };
    time_analysis?: {
      avg_total_time: number;
      median_total_time: number;
      bottleneck_stage: string;
    };
  };
  visualizations: {
    funnel_chart?: string;
    conversion_bars?: string;
    drop_off_chart?: string;
    segment_comparison?: string;
    time_distribution?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    total_stages: number;
    total_users: number;
    overall_conversion: number;
  };
}

const ANALYSIS_TYPES = [
  { value: "standard", label: "Standard Funnel", desc: "Basic conversion analysis", icon: Filter },
  { value: "time_based", label: "Time-Based Funnel", desc: "With time metrics", icon: Clock },
  { value: "segmented", label: "Segmented Funnel", desc: "Compare by segments", icon: Users },
];

const STAGE_ICONS: { [key: string]: React.FC<{ className?: string }> } = {
  'Visit': Eye,
  'View': Eye,
  'Landing': Eye,
  'Signup': LogIn,
  'Register': LogIn,
  'Login': LogIn,
  'Browse': MousePointer,
  'Search': MousePointer,
  'Product View': FileCheck,
  'Add to Cart': ShoppingCart,
  'Cart': ShoppingCart,
  'Checkout': CreditCard,
  'Payment': CreditCard,
  'Purchase': CreditCard,
  'Complete': CheckCircle2,
  'Submit': Send,
  'Confirm': UserCheck,
};

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const stages = ['Visit', 'Signup', 'Browse', 'Add to Cart', 'Checkout', 'Purchase'];
  const segments = ['Organic', 'Paid', 'Referral', 'Direct'];
  const devices = ['Desktop', 'Mobile', 'Tablet'];
  
  // Conversion rates for each stage transition
  const conversionRates = [1.0, 0.35, 0.70, 0.45, 0.65, 0.80];
  
  for (let userId = 1; userId <= 5000; userId++) {
    const segment = segments[Math.floor(Math.random() * segments.length)];
    const device = devices[Math.floor(Math.random() * devices.length)];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));
    
    let currentTime = startDate.getTime();
    let reachedStage = 0;
    
    // Determine how far this user gets in the funnel
    for (let i = 0; i < stages.length; i++) {
      // Adjust conversion rate by segment
      let adjustedRate = conversionRates[i];
      if (segment === 'Paid') adjustedRate *= 1.15;
      if (segment === 'Organic') adjustedRate *= 0.95;
      if (device === 'Mobile') adjustedRate *= 0.90;
      
      if (Math.random() < adjustedRate) {
        reachedStage = i;
      } else {
        break;
      }
    }
    
    // Record all stages the user reached
    for (let i = 0; i <= reachedStage; i++) {
      const stageTime = new Date(currentTime);
      const timeInStage = Math.floor(Math.random() * 300) + 30; // 30-330 seconds
      
      data.push({
        user_id: `USER_${String(userId).padStart(5, '0')}`,
        stage: stages[i],
        stage_order: i + 1,
        timestamp: stageTime.toISOString(),
        time_in_stage: timeInStage,
        segment: segment,
        device: device,
        session_id: `SESSION_${String(userId).padStart(5, '0')}_${Math.floor(Math.random() * 3) + 1}`,
      });
      
      currentTime += timeInStage * 1000;
    }
  }
  
  return data;
};

const MetricCard: React.FC<{ value: string | number; label: string; negative?: boolean; highlight?: boolean }> = ({ value, label, negative, highlight }) => (
  <div className={`text-center p-4 rounded-lg border ${negative ? 'border-destructive/30 bg-destructive/5' : highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
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
    a.download = 'funnel_analysis_source_data.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length.toLocaleString()} rows × {columns.length} columns</Badge>
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
                {columns.slice(0, 6).map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 10).map((row, i) => (
                <TableRow key={i}>
                  {columns.slice(0, 6).map(col => (
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

const ProgressBar: React.FC<{ currentStep: number; hasResults: boolean; onStepClick: (step: number) => void }> = ({ currentStep, hasResults, onStepClick }) => {
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

const FunnelVisualizer: React.FC<{ stages: StageMetrics[] }> = ({ stages }) => {
  if (!stages || stages.length === 0) return null;
  
  const maxUsers = stages[0]?.users || 1;
  
  return (
    <div className="space-y-2">
      {stages.map((stage, idx) => {
        const widthPercent = (stage.users / maxUsers) * 100;
        const IconComponent = STAGE_ICONS[stage.stage_name] || Filter;
        const isLastStage = idx === stages.length - 1;
        
        return (
          <div key={stage.stage_name} className="relative">
            <div 
              className="relative h-14 rounded-lg bg-gradient-to-r from-primary/80 to-primary/60 flex items-center justify-between px-4 transition-all"
              style={{ width: `${Math.max(widthPercent, 20)}%`, marginLeft: `${(100 - Math.max(widthPercent, 20)) / 2}%` }}
            >
              <div className="flex items-center gap-2">
                <IconComponent className="w-4 h-4 text-primary-foreground" />
                <span className="text-sm font-medium text-primary-foreground">{stage.stage_name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-primary-foreground">{stage.users.toLocaleString()}</span>
                <span className="text-xs text-primary-foreground/80 ml-2">({stage.cumulative_conversion.toFixed(1)}%)</span>
              </div>
            </div>
            
            {!isLastStage && stage.drop_off_rate > 0 && (
              <div className="flex items-center justify-center py-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowDown className="w-3 h-3" />
                  <span className="text-destructive font-medium">-{stage.drop_off_count.toLocaleString()} ({stage.drop_off_rate.toFixed(1)}% drop-off)</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};


// IntroPage 컴포넌트 바로 앞에 추가
const StatisticalGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Funnel Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Funnel Analysis?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Funnel analysis is a method for visualizing and analyzing the sequential steps users take to complete 
              a desired action (conversion). It identifies where users drop off in the process, helping businesses 
              understand bottlenecks and optimize conversion rates. Common funnels include e-commerce checkout, 
              signup flows, lead generation, and onboarding processes.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analysis Methods
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. Standard Funnel Analysis</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Basic conversion tracking through sequential stages<br/>
                  <strong>Method:</strong> Count unique users at each stage, calculate conversion rates<br/>
                  <strong>Formula:</strong> Conversion Rate = (Users at Stage N+1) / (Users at Stage N) × 100%<br/>
                  <strong>Best for:</strong> Understanding overall funnel performance and identifying bottlenecks
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. Time-Based Funnel Analysis</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Measure how long users spend at each stage<br/>
                  <strong>Method:</strong> Track timestamps and calculate time differences between stages<br/>
                  <strong>Metrics:</strong> Average time, median time, time-to-convert<br/>
                  <strong>Best for:</strong> Identifying stages where users get stuck or hesitate
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. Segmented Funnel Analysis</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Compare funnel performance across different user groups<br/>
                  <strong>Method:</strong> Split users by attributes (channel, device, demographics) and analyze separately<br/>
                  <strong>Use cases:</strong> Compare mobile vs desktop, organic vs paid traffic, new vs returning users<br/>
                  <strong>Best for:</strong> Identifying which segments perform best and need different optimization
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
                <p className="font-medium text-sm">Conversion Rate (Stage-to-Stage)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Percentage of users who progress from one stage to the next. Example: If 1000 users visit your site 
                  and 350 sign up, the Visit→Signup conversion rate is 35%. Higher rates indicate better stage performance.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Drop-off Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Percentage of users who abandon the funnel at each stage. Calculated as: 100% - Conversion Rate. 
                  Drop-off rates above 30% typically indicate significant friction that needs addressing.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Overall Conversion Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Percentage of users who enter the funnel and complete all stages. Calculated from entry point to 
                  final conversion. E-commerce funnels typically see 1-3%, SaaS signup 5-15%, lead gen 20-30%.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Cumulative Conversion</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Percentage of original entrants still remaining at each stage. Shows funnel narrowing effect. 
                  Example: If you start with 1000 users and 250 reach checkout, cumulative conversion is 25%.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Bottleneck Stage</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The stage with the highest drop-off rate. This is your primary optimization target. Improving the 
                  bottleneck typically yields the greatest impact on overall conversion rates.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Time in Stage (Time-Based Analysis)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Average or median duration users spend at each stage. Long times may indicate confusion or hesitation. 
                  Very short times followed by drop-off suggest immediate friction or unclear value.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Interpretation Guidelines
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>High Drop-off Early:</strong> Likely traffic quality or value proposition issues—review targeting and messaging</p>
              <p><strong>High Drop-off at Signup:</strong> Form friction or trust concerns—simplify fields, add social proof</p>
              <p><strong>High Drop-off at Checkout:</strong> Pricing surprises or payment issues—show total early, offer multiple payment options</p>
              <p><strong>Gradual Drop-off Throughout:</strong> General friction across journey—comprehensive UX audit needed</p>
              <p><strong>Sudden Drop-off at One Stage:</strong> Specific stage problem—likely technical issue or major friction point</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Common Pitfalls & Limitations
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Stage Order Matters:</strong> Funnel assumes linear progression; users may skip or repeat stages in reality</p>
              <p>• <strong>Attribution Windows:</strong> Define clear time windows for funnel completion (e.g., 7 days, 30 days)</p>
              <p>• <strong>Multiple Paths:</strong> Users may take different routes; standard funnels don't capture all journeys</p>
              <p>• <strong>Sample Size:</strong> Need sufficient volume (100+ users) for statistical reliability at each stage</p>
              <p>• <strong>Time Period:</strong> Results vary by day of week, season, campaigns—analyze consistent periods</p>
              <p>• <strong>Technical Issues:</strong> Drop-offs may be due to bugs, not user intent—validate with testing</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Optimization Best Practices
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Prioritization</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Focus on bottleneck (highest drop-off) first</li>
                  <li>• Prioritize high-traffic stages for max impact</li>
                  <li>• Quick wins: Fix obvious technical errors</li>
                  <li>• Long-term: Redesign problematic stages</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Testing Strategy</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• A/B test changes to problem stages</li>
                  <li>• Test one variable at a time</li>
                  <li>• Run for statistical significance</li>
                  <li>• Document all tests and learnings</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Stage-Specific Fixes</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Landing pages: Clear headlines, benefits</li>
                  <li>• Forms: Minimize fields, progressive disclosure</li>
                  <li>• Product pages: Reviews, detailed info, images</li>
                  <li>• Checkout: Guest option, show total early</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Monitoring</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Track funnel metrics weekly</li>
                  <li>• Set up alerts for unusual drops</li>
                  <li>• Compare periods (week-over-week)</li>
                  <li>• Review after major changes</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Industry Benchmarks
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">E-commerce Checkout Funnel</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Typical Conversion:</strong> 2-3% (visit to purchase)<br/>
                  <strong>Cart Abandonment:</strong> 60-80% industry average<br/>
                  <strong>Add-to-Cart Rate:</strong> 10-15% of visitors<br/>
                  <strong>Checkout Completion:</strong> 20-30% of cart additions
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">SaaS Signup Funnel</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Visitor to Trial:</strong> 5-10%<br/>
                  <strong>Trial to Paid:</strong> 15-25%<br/>
                  <strong>Overall Conversion:</strong> 1-3% visitor to customer<br/>
                  <strong>Activation Rate:</strong> 30-40% of signups become active users
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Lead Generation Funnel</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Landing to Lead:</strong> 20-30% (B2C), 10-15% (B2B)<br/>
                  <strong>Lead to Qualified:</strong> 25-30%<br/>
                  <strong>Qualified to Opportunity:</strong> 50-60%<br/>
                  <strong>Overall Lead-to-Customer:</strong> 5-10%
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Advanced Techniques
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Cohort Analysis</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Compare funnel performance across user cohorts (signup month, first campaign, etc.) to identify 
                  trends and impact of changes over time.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Multi-Path Funnels</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Analyze non-linear user journeys using tools like Sankey diagrams to visualize all possible paths 
                  and identify common alternative routes to conversion.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Micro-Conversion Tracking</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Break down stages into smaller actions (e.g., "viewed pricing" → "clicked buy" → "entered email") 
                  to pinpoint exact friction points within broader stages.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Remember:</strong> Funnel analysis is a diagnostic tool, not a complete 
              solution. Use it to identify problems, then combine with qualitative research (user testing, surveys, 
              session recordings) to understand WHY users drop off. The numbers tell you WHERE to look; user research 
              tells you WHAT to fix. Always validate optimization hypotheses with A/B testing before full implementation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};



const IntroPage: React.FC<{ onLoadSample: () => void; onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Filter className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Funnel Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Analyze user journey through your conversion funnel. Identify drop-off points, 
          optimize conversion rates, and understand where users abandon the process.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
        {ANALYSIS_TYPES.map((type) => (
          <div key={type.value} className="p-5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <type.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use Funnel Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "User/Session ID column",
                  "Stage/Step column",
                  "Stage order (optional)",
                  "Timestamp (for time analysis)",
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
                  "Stage-by-stage conversion rates",
                  "Drop-off analysis",
                  "Bottleneck identification",
                  "Segment comparison (optional)",
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

export default function FunnelAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<FunnelAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  
  // Configuration state
  const [userCol, setUserCol] = useState<string>("");
  const [stageCol, setStageCol] = useState<string>("");
  const [stageOrderCol, setStageOrderCol] = useState<string>("");
  const [timestampCol, setTimestampCol] = useState<string>("");
  const [segmentCol, setSegmentCol] = useState<string>("");
  const [analysisType, setAnalysisType] = useState<string>("standard");
  const [customStageOrder, setCustomStageOrder] = useState<string[]>([]);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setUserCol("user_id");
    setStageCol("stage");
    setStageOrderCol("stage_order");
    setTimestampCol("timestamp");
    setSegmentCol("segment");
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

  // Get unique stages from data
  const uniqueStages = React.useMemo(() => {
    if (!stageCol || data.length === 0) return [];
    const stages = [...new Set(data.map(d => String(d[stageCol])))];
    return stages.filter(s => s && s !== 'null' && s !== 'undefined');
  }, [data, stageCol]);

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const uniqueUsers = new Set(data.map(d => d[userCol])).size;
    const stageCount = uniqueStages.length;
    
    const checks: ValidationCheck[] = [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length.toLocaleString()} rows loaded` : "No data loaded"
      },
      {
        name: "User Column",
        passed: !!userCol,
        message: userCol ? `${uniqueUsers.toLocaleString()} unique users` : "Select user column"
      },
      {
        name: "Stage Column",
        passed: !!stageCol,
        message: stageCol ? `${stageCount} stages identified` : "Select stage column"
      },
      {
        name: "Sufficient Users",
        passed: uniqueUsers >= 100,
        message: uniqueUsers >= 500 ? `${uniqueUsers} users (excellent)` :
                 uniqueUsers >= 100 ? `${uniqueUsers} users (acceptable)` :
                 `Only ${uniqueUsers} users (need ≥100)`
      },
      {
        name: "Multiple Stages",
        passed: stageCount >= 2,
        message: stageCount >= 3 ? `${stageCount} stages (good)` :
                 stageCount >= 2 ? `${stageCount} stages (minimum)` :
                 `Need at least 2 stages`
      }
    ];
    
    if (analysisType === "time_based") {
      checks.push({
        name: "Timestamp Column",
        passed: !!timestampCol,
        message: timestampCol ? `Using: ${timestampCol}` : "Select timestamp for time analysis"
      });
    }
    
    if (analysisType === "segmented") {
      checks.push({
        name: "Segment Column",
        passed: !!segmentCol,
        message: segmentCol ? `Using: ${segmentCol}` : "Select segment column for comparison"
      });
    }
    
    return checks;
  }, [data, userCol, stageCol, uniqueStages, analysisType, timestampCol, segmentCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload: any = {
        data,
        user_col: userCol,
        stage_col: stageCol,
        stage_order_col: stageOrderCol || null,
        timestamp_col: analysisType === "time_based" ? timestampCol : null,
        segment_col: analysisType === "segmented" ? segmentCol : null,
        analysis_type: analysisType,
        custom_stage_order: customStageOrder.length > 0 ? customStageOrder : null,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/funnel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: FunnelAnalysisResult = await res.json();
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
    const stages = results.results.stage_metrics;
    if (!stages.length) return;
    
    const headers = ['Stage', 'Users', 'Conversion Rate', 'Drop-off Rate', 'Drop-off Count', 'Cumulative Conversion'];
    const rows = stages.map(s => [
      s.stage_name,
      s.users,
      (s.conversion_rate * 100).toFixed(2) + '%',
      (s.drop_off_rate).toFixed(2) + '%',
      s.drop_off_count,
      (s.cumulative_conversion).toFixed(2) + '%'
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'funnel_analysis.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `funnel_${chartKey}.png`;
    a.click();
  };

  // Step 2: Configuration
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Funnel Analysis
        </CardTitle>
        <CardDescription>Set up funnel analysis parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Analysis Type */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Analysis Type
          </h4>
          <div className="grid md:grid-cols-3 gap-3">
            {ANALYSIS_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setAnalysisType(type.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  analysisType === type.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <type.icon className="w-5 h-5 text-primary mb-2" />
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.desc}</p>
              </button>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Required Columns */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Required Columns
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>User/Session ID *</Label>
              <Select value={userCol || "__none__"} onValueChange={v => setUserCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Unique identifier for each user</p>
            </div>
            <div className="space-y-2">
              <Label>Stage/Step Column *</Label>
              <Select value={stageCol || "__none__"} onValueChange={v => setStageCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Funnel stage name</p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Optional Columns */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Optional Columns
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stage Order Column</Label>
              <Select value={stageOrderCol || "__none__"} onValueChange={v => setStageOrderCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- None --</SelectItem>
                  {columns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Numeric order of stages (1, 2, 3...)</p>
            </div>
            
            {analysisType === "time_based" && (
              <div className="space-y-2">
                <Label>Timestamp Column *</Label>
                <Select value={timestampCol || "__none__"} onValueChange={v => setTimestampCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Select --</SelectItem>
                    {columns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Event timestamp for time analysis</p>
              </div>
            )}
            
            {analysisType === "segmented" && (
              <div className="space-y-2">
                <Label>Segment Column *</Label>
                <Select value={segmentCol || "__none__"} onValueChange={v => setSegmentCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Select --</SelectItem>
                    {columns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Segment for comparison (e.g., channel, device)</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Stage Order Preview */}
        {uniqueStages.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Detected Stages ({uniqueStages.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {uniqueStages.map((stage, idx) => (
                  <Badge key={stage} variant="secondary" className="text-sm">
                    {idx + 1}. {stage}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Stages will be ordered by stage_order column if provided, otherwise by first appearance.
              </p>
            </div>
          </>
        )}
        
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
          
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Configuration Summary</p>
                <p className="text-muted-foreground">
                  {`Analysis: ${ANALYSIS_TYPES.find(t => t.value === analysisType)?.label} • `}
                  {`User: ${userCol} • Stage: ${stageCol}`}
                  {stageOrderCol && ` • Order: ${stageOrderCol}`}
                  {timestampCol && analysisType === "time_based" && ` • Time: ${timestampCol}`}
                  {segmentCol && analysisType === "segmented" && ` • Segment: ${segmentCol}`}
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
            <Button onClick={runAnalysis} disabled={loading || !canRun} className="gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Run Analysis
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 4: Summary
  const renderStep4Summary = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights } = results;
    const stages = r.stage_metrics;
    const biggestDropOff = r.biggest_drop_off;
    
    const finding = `${summary.total_users.toLocaleString()} users entered the funnel, with ${(summary.overall_conversion).toFixed(1)}% completing all ${summary.total_stages} stages. The biggest drop-off occurs at "${biggestDropOff.stage}" where ${biggestDropOff.drop_off_rate.toFixed(1)}% of users (${biggestDropOff.drop_off_count.toLocaleString()}) abandon the process. This stage should be prioritized for optimization.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Funnel Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={summary.total_users.toLocaleString()} label="Total Users" highlight />
            <MetricCard value={r.total_converted.toLocaleString()} label="Converted" />
            <MetricCard value={`${summary.overall_conversion.toFixed(1)}%`} label="Overall Conversion" highlight />
            <MetricCard value={summary.total_stages} label="Stages" />
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Funnel Visualization
            </h4>
            <FunnelVisualizer stages={stages} />
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Biggest Drop-off Point
            </h4>
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{biggestDropOff.stage}</p>
                  <p className="text-sm text-muted-foreground">
                    {biggestDropOff.drop_off_count.toLocaleString()} users dropped off
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-destructive">{biggestDropOff.drop_off_rate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Drop-off Rate</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.map((insight, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  insight.status === "positive" ? "border-primary/30 bg-primary/5" :
                  insight.status === "warning" ? "border-destructive/30 bg-destructive/5" :
                  "border-border bg-muted/10"
                }`}
              >
                {insight.status === "positive" ? (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                ) : insight.status === "warning" ? (
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
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
            detail={`This funnel analysis examined ${summary.total_users.toLocaleString()} users across ${summary.total_stages} stages.

■ Funnel Analysis Overview
Funnel analysis is a method for analyzing user behavior through a series of sequential steps. It helps identify where users drop off and which stages need optimization.

• Key Metrics Explained:
  - Conversion Rate: Percentage of users who proceed from one stage to the next
  - Drop-off Rate: Percentage of users who leave at each stage
  - Cumulative Conversion: Percentage of original users remaining at each stage

• Current Funnel Performance:
  - Entry: ${stages[0]?.users.toLocaleString()} users
  - Exit: ${stages[stages.length - 1]?.users.toLocaleString()} users
  - Overall Conversion: ${summary.overall_conversion.toFixed(1)}%
  - Total Drop-off: ${(100 - summary.overall_conversion).toFixed(1)}%

■ Stage-by-Stage Analysis
${stages.map((stage, idx) => {
  const prevStage = idx > 0 ? stages[idx - 1] : null;
  return `${idx + 1}. ${stage.stage_name}: ${stage.users.toLocaleString()} users (${stage.cumulative_conversion.toFixed(1)}% of total)${idx > 0 ? ` - ${stage.drop_off_rate.toFixed(1)}% drop-off from ${prevStage?.stage_name}` : ' - Entry point'}`;
}).join('\n')}

■ Critical Observation
The "${biggestDropOff.stage}" stage shows the highest drop-off rate at ${biggestDropOff.drop_off_rate.toFixed(1)}%. This represents ${biggestDropOff.drop_off_count.toLocaleString()} users who could potentially be recovered with targeted optimization efforts.

Industry benchmarks suggest:
• E-commerce checkout funnels: 2-3% overall conversion is typical
• SaaS signup funnels: 10-15% is considered good
• Lead generation: 20-30% can be achieved with optimization

Your funnel's ${summary.overall_conversion.toFixed(1)}% conversion rate ${summary.overall_conversion > 10 ? 'is performing well' : 'has room for improvement'}.`}
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

  // Step 5: Why (Understanding)
  const renderStep5Why = () => {
    if (!results) return null;
    
    const { results: r } = results;
    const stages = r.stage_metrics;
    
    const stageOptimizations: { [key: string]: { issues: string[]; tactics: string[] } } = {
      'Visit': { issues: ['Low traffic', 'Poor SEO', 'Ineffective ads'], tactics: ['SEO optimization', 'Paid advertising', 'Content marketing', 'Social media'] },
      'Landing': { issues: ['Slow load time', 'Poor design', 'Unclear value prop'], tactics: ['Page speed optimization', 'A/B test headlines', 'Clear CTAs', 'Mobile optimization'] },
      'Signup': { issues: ['Too many fields', 'Trust concerns', 'Unclear benefits'], tactics: ['Simplify form', 'Add social proof', 'Show benefits', 'Offer incentives'] },
      'Browse': { issues: ['Poor navigation', 'Limited selection', 'Bad search'], tactics: ['Improve search', 'Better filters', 'Personalization', 'Recommendations'] },
      'Add to Cart': { issues: ['Price concerns', 'Unclear details', 'No urgency'], tactics: ['Show savings', 'Detailed descriptions', 'Scarcity messaging', 'Reviews'] },
      'Checkout': { issues: ['Complicated process', 'Hidden costs', 'Payment issues'], tactics: ['Guest checkout', 'Show total early', 'Multiple payment options', 'Progress indicator'] },
      'Purchase': { issues: ['Last-minute doubts', 'Technical errors', 'Shipping costs'], tactics: ['Free shipping threshold', 'Money-back guarantee', 'Live chat support', 'Cart abandonment emails'] },
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5 text-primary" />
            Understanding the Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={`Funnel analysis reveals where users drop off in your conversion process. By understanding each stage's performance, you can prioritize optimization efforts and improve overall conversion rates.`} />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Metrics Explained</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "Conversion Rate", content: "The percentage of users who successfully move from one stage to the next. Calculated as: (Users at Stage N+1) / (Users at Stage N) × 100. Higher is better." },
                { num: 2, title: "Drop-off Rate", content: "The percentage of users who leave at each stage. Calculated as: 100 - Conversion Rate. This represents lost potential customers. Lower is better." },
                { num: 3, title: "Cumulative Conversion", content: "The percentage of original users remaining at each stage. Shows how the funnel narrows. Calculated from the entry point of the funnel." },
                { num: 4, title: "Bottleneck Stage", content: "The stage with the highest drop-off rate. This is where optimization efforts should be focused first for maximum impact." },
              ].map((exp) => (
                <div key={exp.num} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                      {exp.num}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{exp.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{exp.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Stage-by-Stage Optimization Strategies</h4>
            <div className="space-y-4">
              {stages.map((stage, idx) => {
                const optimization = stageOptimizations[stage.stage_name] || {
                  issues: ['User friction', 'Unclear next steps', 'Technical problems'],
                  tactics: ['User testing', 'Clear CTAs', 'Technical optimization', 'A/B testing']
                };
                const isHighDropOff = stage.drop_off_rate > 30;
                const isCritical = stage.stage_name === r.biggest_drop_off.stage;
                
                return (
                  <div key={stage.stage_name} className={`p-4 rounded-lg border ${isCritical ? 'border-destructive/30 bg-destructive/5' : isHighDropOff ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-muted/10'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={isCritical ? "destructive" : isHighDropOff ? "outline" : "secondary"} className="text-xs">
                          Stage {idx + 1}
                        </Badge>
                        <span className="font-medium">{stage.stage_name}</span>
                        {isCritical && <Badge variant="destructive" className="text-xs">Critical</Badge>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{stage.users.toLocaleString()} users</p>
                        <p className="text-xs text-muted-foreground">{stage.drop_off_rate.toFixed(1)}% drop-off</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Common Issues:</p>
                        <ul className="space-y-1">
                          {optimization.issues.map(issue => (
                            <li key={issue} className="text-xs text-muted-foreground flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-destructive" /> {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Optimization Tactics:</p>
                        <div className="flex flex-wrap gap-1">
                          {optimization.tactics.map(tactic => (
                            <Badge key={tactic} variant="outline" className="text-xs">{tactic}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <DetailParagraph
            title="Strategic Recommendations"
            detail={`Based on the funnel analysis results, here are detailed strategic recommendations for optimization.

■ 1. Prioritization Framework

【Priority Matrix for Optimization】
Use this framework to decide where to focus efforts:

| Drop-off Rate | User Volume | Priority | Action |
|--------------|-------------|----------|--------|
| High (>30%) | High | Critical | Immediate optimization |
| High (>30%) | Low | Medium | Test and monitor |
| Low (<15%) | High | Low | Maintain current |
| Low (<15%) | Low | Lowest | Deprioritize |

Based on your data, the critical optimization target is "${r.biggest_drop_off.stage}" with ${r.biggest_drop_off.drop_off_rate.toFixed(1)}% drop-off.

■ 2. Stage-Specific Strategies

【Top of Funnel (Awareness/Visit)】
Goal: Increase traffic and initial engagement
• SEO and content marketing for organic traffic
• Targeted paid advertising campaigns
• Social proof and trust signals on landing pages
• Mobile-first design approach

【Middle of Funnel (Consideration/Engagement)】
Goal: Nurture interest and reduce friction
• Clear value propositions
• Progressive disclosure of information
• Personalization based on behavior
• Retargeting for non-converters

【Bottom of Funnel (Conversion/Purchase)】
Goal: Minimize last-step abandonment
• Simplified checkout process
• Multiple payment options
• Clear shipping/pricing information
• Cart abandonment recovery campaigns

■ 3. Testing Strategy

【A/B Testing Priority】
1. Test changes at highest drop-off stages first
2. Focus on one variable at a time
3. Run tests for statistical significance (typically 1-2 weeks)
4. Document all tests and learnings

【Key Elements to Test】
• Headlines and value propositions
• CTA button text, color, placement
• Form length and field order
• Page layout and visual hierarchy
• Trust signals and social proof

■ 4. Measurement Framework

【KPIs to Track】
• Overall funnel conversion rate (target: improve by 10-20%)
• Stage-by-stage conversion rates
• Time spent at each stage
• Drop-off recovery rate

【Monitoring Cadence】
• Daily: Check for anomalies
• Weekly: Review stage-by-stage performance
• Monthly: Deep dive analysis and strategy review
• Quarterly: Full funnel audit and optimization planning

■ 5. Expected Impact

If you can reduce drop-off at "${r.biggest_drop_off.stage}" by 20%:
• Additional users retained: ~${Math.round(r.biggest_drop_off.drop_off_count * 0.2).toLocaleString()}
• Potential conversion lift: ${((r.biggest_drop_off.drop_off_count * 0.2) / r.total_users * 100).toFixed(1)}%

This represents significant revenue potential and should be the primary focus of optimization efforts.`}
          />
          
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

  // Step 6: Full Report
  const renderStep6Report = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights, visualizations } = results;
    const stages = r.stage_metrics;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Funnel Analysis Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ANALYSIS_TYPES.find(t => t.value === analysisType)?.label} | {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={summary.total_users.toLocaleString()} label="Total Users" highlight />
              <MetricCard value={r.total_converted.toLocaleString()} label="Converted" />
              <MetricCard value={`${summary.overall_conversion.toFixed(1)}%`} label="Conversion Rate" highlight />
              <MetricCard value={`${r.biggest_drop_off.drop_off_rate.toFixed(1)}%`} label="Max Drop-off" negative />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This funnel analysis examined {summary.total_users.toLocaleString()} users across {summary.total_stages} stages.
              The overall conversion rate is {summary.overall_conversion.toFixed(1)}%, with {r.total_converted.toLocaleString()} users 
              completing the full funnel. The biggest optimization opportunity is at the "{r.biggest_drop_off.stage}" stage 
              where {r.biggest_drop_off.drop_off_rate.toFixed(1)}% of users drop off.
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
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  ins.status === "warning" ? "border-destructive/30 bg-destructive/5" :
                  ins.status === "positive" ? "border-primary/30 bg-primary/5" :
                  "border-border bg-muted/10"
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
        
        {/* Funnel Visualization */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Funnel Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelVisualizer stages={stages} />
          </CardContent>
        </Card>
        
        {/* Charts */}
        {visualizations && Object.keys(visualizations).some(k => visualizations[k as keyof typeof visualizations]) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Charts</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
                <TabsList className="mb-4 flex-wrap">
                  {visualizations.funnel_chart && <TabsTrigger value="funnel_chart" className="text-xs">Funnel</TabsTrigger>}
                  {visualizations.conversion_bars && <TabsTrigger value="conversion_bars" className="text-xs">Conversion</TabsTrigger>}
                  {visualizations.drop_off_chart && <TabsTrigger value="drop_off_chart" className="text-xs">Drop-off</TabsTrigger>}
                  {visualizations.segment_comparison && <TabsTrigger value="segment_comparison" className="text-xs">Segments</TabsTrigger>}
                  {visualizations.time_distribution && <TabsTrigger value="time_distribution" className="text-xs">Time</TabsTrigger>}
                </TabsList>
                {Object.entries(visualizations).map(([key, value]) => value && (
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
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}
        
        {/* Stage Metrics Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stage Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                  <TableHead className="text-right">Drop-off</TableHead>
                  <TableHead className="text-right">Cumulative</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stages.map((stage, idx) => (
                  <TableRow key={stage.stage_name} className={stage.stage_name === r.biggest_drop_off.stage ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {stage.stage_name}
                        {stage.stage_name === r.biggest_drop_off.stage && (
                          <Badge variant="destructive" className="text-xs">Bottleneck</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{stage.users.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {idx === 0 ? '-' : `${(stage.conversion_rate * 100).toFixed(1)}%`}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={stage.drop_off_rate > 30 ? 'text-destructive font-medium' : ''}>
                        {stage.drop_off_rate > 0 ? `${stage.drop_off_rate.toFixed(1)}%` : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{stage.cumulative_conversion.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <DetailParagraph
              title="Stage Metrics Interpretation"
              detail={`How to interpret the stage metrics table:

■ Users Column
The number of unique users who reached each stage. This number should decrease (or stay the same) as you move down the funnel.

■ Conversion Rate
The percentage of users from the previous stage who proceeded to this stage. For example, if Stage 1 has 1000 users and Stage 2 has 350 users, the conversion rate for Stage 2 is 35%.

■ Drop-off Rate
The inverse of conversion rate - the percentage of users who left at each stage. High drop-off rates (typically >30%) indicate problem areas that need attention.

■ Cumulative Conversion
The percentage of original funnel entrants who reached this stage. This shows the overall funnel "leakage" at each point.

■ Bottleneck Identification
The stage marked as "Bottleneck" has the highest drop-off rate and represents the biggest opportunity for improvement. Focusing optimization efforts here will have the greatest impact on overall funnel performance.

■ Benchmark Guidance
• Excellent: <15% drop-off rate per stage
• Good: 15-25% drop-off rate per stage
• Needs Attention: 25-35% drop-off rate per stage
• Critical: >35% drop-off rate per stage`}
            />
          </CardContent>
        </Card>
        
        {/* Segment Analysis (if available) */}
        {r.segment_analysis && Object.keys(r.segment_analysis).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Segment Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Segment</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Converted</TableHead>
                    <TableHead className="text-right">Conversion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(r.segment_analysis).map(([segment, data]) => (
                    <TableRow key={segment}>
                      <TableCell className="font-medium">{segment}</TableCell>
                      <TableCell className="text-right">{data.stages[0]?.users.toLocaleString() || '-'}</TableCell>
                      <TableCell className="text-right">{data.stages[data.stages.length - 1]?.users.toLocaleString() || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{data.overall_conversion.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
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
                CSV (Stage Metrics)
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
            <HelpCircle className="w-4 h-4" />
            Statistical Guide
          </Button>
        </div>
      )}
      
      <StatisticalGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
      
      {currentStep > 1 && (
        <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />
      )}
      
      
      {currentStep > 1 && data.length > 0 && (
        <DataPreview data={data} columns={columns} />
      )}
      
      {currentStep === 1 && <IntroPage onLoadSample={handleLoadSample} onFileUpload={handleFileUpload} />}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}

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
  ChevronRight, Calendar, Users, Repeat, DollarSign,
  BarChart3, LineChart, TrendingDown, Zap, Clock
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface CohortResult {
  success: boolean;
  results: {
    cohort_type: string;
    cohort_period: string;
    metrics: {
      initial_retention?: number;
      period_1_retention?: number;
      long_term_retention?: number;
      retention_curve?: number[];
      retention_periods?: number[];
      total_revenue?: number;
      avg_revenue_per_cohort?: number;
      revenue_by_period?: number[];
    };
    cohort_table: {
      index: string[];
      columns: number[];
      data: number[][];
    };
  };
  visualizations: {
    retention_heatmap?: string;
    retention_curves?: string;
    avg_retention_curve?: string;
    revenue_heatmap?: string;
    cumulative_revenue?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    cohort_type: string;
    total_cohorts: number;
    total_users: number;
    date_range: string;
  };
}

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const numUsers = 500;
  const startDate = new Date('2024-01-01');
  
  for (let i = 0; i < numUsers; i++) {
    const userId = `USER_${String(i + 1).padStart(4, '0')}`;
    
    // Random signup date (cohort assignment)
    const cohortOffset = Math.floor(Math.random() * 180); // 6 months
    const signupDate = new Date(startDate);
    signupDate.setDate(signupDate.getDate() + cohortOffset);
    
    // First event (signup)
    data.push({
      user_id: userId,
      event_date: signupDate.toISOString().split('T')[0],
      event_type: 'signup',
      revenue: 0
    });
    
    // Simulate retention with decreasing probability
    let active = true;
    let currentDate = new Date(signupDate);
    let monthsSinceSignup = 0;
    
    while (active && monthsSinceSignup < 6) {
      monthsSinceSignup++;
      currentDate.setMonth(currentDate.getMonth() + 1);
      
      // Retention probability decreases over time
      const retentionProb = 0.6 * Math.pow(0.85, monthsSinceSignup - 1);
      
      if (Math.random() < retentionProb) {
        // User is active this month
        const numEvents = 1 + Math.floor(Math.random() * 3);
        
        for (let j = 0; j < numEvents; j++) {
          const eventDate = new Date(currentDate);
          eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 28));
          
          const revenue = Math.random() < 0.3 ? (20 + Math.random() * 80) : 0;
          
          data.push({
            user_id: userId,
            event_date: eventDate.toISOString().split('T')[0],
            event_type: revenue > 0 ? 'purchase' : 'visit',
            revenue: parseFloat(revenue.toFixed(2))
          });
        }
      } else {
        active = false;
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
}> = ({ value, label, icon: Icon, highlight }) => (
  <div className={`text-center p-4 rounded-lg border ${
    highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className="w-5 h-5 mx-auto mb-2 text-primary" />}
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
    a.download = 'cohort_source_data.csv';
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
const CohortGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Cohort Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              What is Cohort Analysis?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Cohort analysis groups users by a common characteristic (typically signup date) and tracks their 
              behavior over time. This reveals patterns invisible in aggregate metrics, like whether retention 
              is improving for newer users or if revenue per cohort is increasing.
            </p>
            <div className="p-3 rounded-lg border border-border bg-muted/10">
              <p className="text-sm font-medium mb-2">Key Concept: Time-Based Cohorts</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• <strong>Cohort:</strong> Users who signed up in the same period (e.g., January 2024)</p>
                <p>• <strong>Period 0:</strong> The cohort's starting period (100% of users present)</p>
                <p>• <strong>Period N:</strong> N periods after cohort start (% who returned)</p>
                <p>• <strong>Retention:</strong> Percentage of original cohort still active</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              Retention Cohort Analysis
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">How It Works</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>1. Group users by signup period (cohort assignment)</p>
                  <p>2. Track which users are active in each subsequent period</p>
                  <p>3. Calculate: Retention% = (Active Users / Total Cohort Size) × 100</p>
                  <p>4. Visualize in heatmap: rows = cohorts, columns = periods</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Example</p>
                <div className="text-xs text-muted-foreground space-y-1 font-mono bg-muted/30 p-2 rounded">
                  <p>January 2024 Cohort (100 users):</p>
                  <p>  Period 0 (Jan): 100 users active (100%)</p>
                  <p>  Period 1 (Feb): 60 users active (60%)</p>
                  <p>  Period 2 (Mar): 45 users active (45%)</p>
                  <p>  Period 3 (Apr): 40 users active (40%)</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Revenue Cohort Analysis
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Lifetime Value (LTV) Tracking</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Track cumulative revenue generated by each cohort over time</p>
                  <p>• Calculate average revenue per user in each period</p>
                  <p>• Project future LTV based on historical patterns</p>
                  <p>• Compare cohort profitability to optimize acquisition spend</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Example Calculation</p>
                <div className="text-xs text-muted-foreground space-y-1 font-mono bg-muted/30 p-2 rounded">
                  <p>January Cohort (100 users):</p>
                  <p>  Month 0: $5,000 revenue = $50/user</p>
                  <p>  Month 1: $3,000 revenue = $30/user</p>
                  <p>  Month 2: $2,000 revenue = $20/user</p>
                  <p>  Cumulative LTV: $50 + $30 + $20 = $100/user</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Reading Retention Heatmaps
            </h3>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <p className="font-medium text-sm mb-1">🟢 Green Cells (High Retention)</p>
                <p className="text-xs text-muted-foreground">
                  Good retention (typically {'>'} 40%). Users are engaged and returning regularly. 
                  These cohorts or periods are performing well.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                <p className="font-medium text-sm mb-1">🟡 Yellow Cells (Medium Retention)</p>
                <p className="text-xs text-muted-foreground">
                  Acceptable retention (20-40%). Room for improvement through engagement features 
                  or better onboarding.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="font-medium text-sm mb-1">🔴 Red Cells (Low Retention)</p>
                <p className="text-xs text-muted-foreground">
                  Poor retention ({'<'} 20%). Indicates serious issues with product-market fit, 
                  onboarding, or value delivery. Requires immediate attention.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Common Retention Patterns
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Flat Retention (Ideal)</p>
                <p className="text-xs text-muted-foreground">
                  Retention stays high and stable over time. Excellent product-market fit. 
                  Users find consistent value. Focus on scaling acquisition.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Steep Drop-off (Problem)</p>
                <p className="text-xs text-muted-foreground">
                  Rapid decline in first 1-2 periods. Poor onboarding or unclear value proposition. 
                  Users don't understand the product. Fix: improve first-time experience.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Gradual Decline (Normal)</p>
                <p className="text-xs text-muted-foreground">
                  Steady decrease over time. Expected for most products. Focus on extending curve 
                  through engagement loops and habit formation.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Smiling Curve (Filtering)</p>
                <p className="text-xs text-muted-foreground">
                  Initial drop, then stabilizes. Good - you're retaining core users while casual 
                  users churn. Identify what makes core users stick.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Retention Benchmarks
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2">Industry</th>
                    <th className="text-right p-2">Day 1</th>
                    <th className="text-right p-2">Week 1</th>
                    <th className="text-right p-2">Month 1</th>
                    <th className="text-right p-2">Month 3</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <td className="p-2">SaaS B2B</td>
                    <td className="text-right p-2">60-80%</td>
                    <td className="text-right p-2">50-70%</td>
                    <td className="text-right p-2">40-60%</td>
                    <td className="text-right p-2">30-50%</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2">E-commerce</td>
                    <td className="text-right p-2">40-60%</td>
                    <td className="text-right p-2">30-50%</td>
                    <td className="text-right p-2">20-40%</td>
                    <td className="text-right p-2">15-30%</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2">Social Media</td>
                    <td className="text-right p-2">50-70%</td>
                    <td className="text-right p-2">40-60%</td>
                    <td className="text-right p-2">30-50%</td>
                    <td className="text-right p-2">25-40%</td>
                  </tr>
                  <tr>
                    <td className="p-2">Mobile Games</td>
                    <td className="text-right p-2">40-55%</td>
                    <td className="text-right p-2">30-45%</td>
                    <td className="text-right p-2">15-30%</td>
                    <td className="text-right p-2">10-20%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Common Mistakes to Avoid
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="p-2 rounded border border-border bg-muted/10">
                <p className="font-medium text-foreground mb-1">❌ Ignoring Cohort Sizes</p>
                <p className="text-xs">Small cohorts ({'<'} 50 users) have noisy data. Wait for larger samples before drawing conclusions.</p>
              </div>
              <div className="p-2 rounded border border-border bg-muted/10">
                <p className="font-medium text-foreground mb-1">❌ Not Accounting for Seasonality</p>
                <p className="text-xs">December cohorts may behave differently than June cohorts. Compare year-over-year when possible.</p>
              </div>
              <div className="p-2 rounded border border-border bg-muted/10">
                <p className="font-medium text-foreground mb-1">❌ Comparing Incomplete Cohorts</p>
                <p className="text-xs">Recent cohorts have fewer data points. Only compare periods where all cohorts have data.</p>
              </div>
              <div className="p-2 rounded border border-border bg-muted/10">
                <p className="font-medium text-foreground mb-1">❌ Focusing Only on Retention</p>
                <p className="text-xs">Also track engagement depth, revenue, and feature adoption for complete picture.</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Pro Tip:</strong> Look for improving trends in recent cohorts vs older ones. 
              If Month 1 retention is increasing over time (Jan cohort 40% → Feb cohort 45% → Mar cohort 50%), 
              your product improvements are working. This is the key signal that you're moving in the right direction.
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
          <Repeat className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Cohort Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Track user groups over time to understand retention patterns, revenue trends, and behavioral changes. 
          Identify when users drop off, which cohorts perform best, and optimize your product strategy with 
          data-driven cohort insights.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Repeat className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Retention Analysis</p>
              <p className="text-xs text-muted-foreground">Track user return rates</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Revenue Cohorts</p>
              <p className="text-xs text-muted-foreground">Monitor LTV trends</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Behavioral Patterns</p>
              <p className="text-xs text-muted-foreground">Analyze engagement</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use Cohort Analysis
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
                  "Revenue column (optional, for revenue cohorts)",
                  "Event type column (optional, for behavioral)",
                  "At least 50 records across multiple time periods"
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
                  "Retention heatmaps and curves",
                  "Period-over-period retention rates",
                  "Revenue per cohort and cumulative LTV",
                  "Behavioral engagement patterns",
                  "Cohort performance comparisons"
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
export default function CohortAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<CohortResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const [userIdCol, setUserIdCol] = useState<string>("");
  const [dateCol, setDateCol] = useState<string>("");
  const [cohortType, setCohortType] = useState<string>("retention");
  const [revenueCol, setRevenueCol] = useState<string>("");
  const [eventCol, setEventCol] = useState<string>("");
  const [cohortPeriod, setCohortPeriod] = useState<string>("monthly");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setUserIdCol("user_id");
    setDateCol("event_date");
    setRevenueCol("revenue");
    setEventCol("event_type");
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
        message: data.length > 0 ? `${data.length.toLocaleString()} records loaded` : "No data loaded"
      },
      {
        name: "User ID Column",
        passed: !!userIdCol,
        message: userIdCol ? `Using: ${userIdCol}` : "Select user ID column"
      },
      {
        name: "Date Column",
        passed: !!dateCol,
        message: dateCol ? `Using: ${dateCol}` : "Select date column"
      },
      {
        name: "Sufficient Data",
        passed: data.length >= 50,
        message: data.length >= 50 ? `${data.length} records (good)` : `Only ${data.length} records (need ≥50)`
      }
    ];
    
    if (cohortType === 'revenue') {
      checks.push({
        name: "Revenue Column",
        passed: !!revenueCol,
        message: revenueCol ? `Using: ${revenueCol}` : "Required for revenue analysis"
      });
    }
    
    if (cohortType === 'behavioral') {
      checks.push({
        name: "Event Column",
        passed: !!eventCol,
        message: eventCol ? `Using: ${eventCol}` : "Required for behavioral analysis"
      });
    }
    
    return checks;
  }, [data, userIdCol, dateCol, cohortType, revenueCol, eventCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload: any = {
        data,
        user_id_col: userIdCol,
        date_col: dateCol,
        cohort_type: cohortType,
        cohort_period: cohortPeriod
      };
      
      if (cohortType === 'revenue' && revenueCol) {
        payload.revenue_col = revenueCol;
      }
      if (cohortType === 'behavioral' && eventCol) {
        payload.event_col = eventCol;
      }
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/cohort-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: CohortResult = await res.json();
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
    a.download = `cohort_${chartKey}.png`;
    a.click();
  };

  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Cohort Analysis
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
            <Label>Cohort Type</Label>
            <Select value={cohortType} onValueChange={setCohortType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="retention">Retention</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="behavioral">Behavioral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={cohortPeriod} onValueChange={setCohortPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {cohortType === 'revenue' && (
          <div className="space-y-2">
            <Label>Revenue Column</Label>
            <Select value={revenueCol || "__none__"} onValueChange={v => setRevenueCol(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-- Select --</SelectItem>
                {columns.filter(col => {
                  const sample = data[0]?.[col];
                  return typeof sample === "number" || !isNaN(Number(sample));
                }).map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {cohortType === 'behavioral' && (
          <div className="space-y-2">
            <Label>Event Column</Label>
            <Select value={eventCol || "__none__"} onValueChange={v => setEventCol(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-- Select --</SelectItem>
                {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

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
    const metrics = r.metrics;
    const cohortTable = r.cohort_table;
    
    const finding = `Analyzed ${summary.total_cohorts} cohorts with ${summary.total_users} total users from ${summary.date_range}. ${
      metrics.period_1_retention 
        ? `Period 1 retention averages ${metrics.period_1_retention.toFixed(1)}%, ${
            metrics.period_1_retention > 40 ? 'indicating strong product-market fit' :
            metrics.period_1_retention > 20 ? 'showing moderate engagement' :
            'suggesting onboarding improvements needed'
          }.`
        : `Revenue analysis shows ${metrics.total_revenue ? `$${metrics.total_revenue.toLocaleString()} total across cohorts` : 'behavioral patterns tracked'}.`
    }`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Cohort Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={summary.total_cohorts} label="Total Cohorts" icon={Calendar} highlight />
            <MetricCard value={summary.total_users.toLocaleString()} label="Total Users" icon={Users} />
            {metrics.period_1_retention !== undefined && (
              <MetricCard 
                value={`${metrics.period_1_retention.toFixed(1)}%`} 
                label="Period 1 Retention" 
                icon={Repeat} 
              />
            )}
            {metrics.long_term_retention !== undefined && (
              <MetricCard 
                value={`${metrics.long_term_retention.toFixed(1)}%`} 
                label="Long-term Retention" 
                icon={TrendingUp} 
              />
            )}
            {metrics.total_revenue !== undefined && (
              <MetricCard 
                value={`$${(metrics.total_revenue / 1000).toFixed(1)}K`} 
                label="Total Revenue" 
                icon={DollarSign} 
              />
            )}
          </div>

          {/* Retention Curve Summary */}
          {metrics.retention_curve && metrics.retention_periods && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Retention Trend</h4>
              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Average Retention by Period</p>
                  <Badge variant="secondary" className="text-xs">
                    {metrics.retention_periods.length} periods tracked
                  </Badge>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mt-3">
                  {metrics.retention_periods.slice(0, 6).map((period, idx) => (
                    <div key={period} className="text-center p-2 rounded bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">P{period}</p>
                      <p className="text-sm font-semibold">
                        {metrics.retention_curve![idx].toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
                {metrics.retention_curve.length > 1 && (
                  <div className="mt-3 p-2 rounded bg-primary/5 border border-primary/20">
                    <p className="text-xs">
                      <strong>Retention Drop:</strong> {' '}
                      {metrics.retention_curve[0] > 0 
                        ? `${((1 - metrics.retention_curve[1] / metrics.retention_curve[0]) * 100).toFixed(1)}% loss from Period 0 to Period 1`
                        : 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Revenue Summary */}
          {metrics.total_revenue !== undefined && metrics.avg_revenue_per_cohort !== undefined && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Revenue Metrics</h4>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <DollarSign className="w-5 h-5 text-primary mb-2" />
                  <p className="text-sm font-medium">Total Revenue</p>
                  <p className="text-2xl font-semibold">${metrics.total_revenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across all {summary.total_cohorts} cohorts
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <TrendingUp className="w-5 h-5 text-primary mb-2" />
                  <p className="text-sm font-medium">Avg Revenue per Cohort</p>
                  <p className="text-2xl font-semibold">${metrics.avg_revenue_per_cohort.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per cohort average
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cohort Table Preview */}
          {cohortTable && cohortTable.index && cohortTable.index.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Cohort Table Preview</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Cohort</TableHead>
                      {cohortTable.columns.slice(0, 6).map((col: number) => (
                        <TableHead key={col} className="text-right text-xs">P{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohortTable.index.slice(0, 5).map((cohort: string, idx: number) => (
                      <TableRow key={cohort}>
                        <TableCell className="text-xs font-medium">{cohort}</TableCell>
                        {cohortTable.data[idx].slice(0, 6).map((value: number, colIdx: number) => (
                          <TableCell 
                            key={colIdx} 
                            className={`text-right text-xs ${
                              value > 60 ? 'text-green-600 font-semibold' :
                              value > 40 ? 'text-blue-600' :
                              value > 20 ? 'text-yellow-600' :
                              value > 0 ? 'text-red-600' :
                              'text-muted-foreground'
                            }`}
                          >
                            {value > 0 ? `${value.toFixed(1)}%` : '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {cohortTable.index.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Showing first 5 of {cohortTable.index.length} cohorts
                  </p>
                )}
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
                    insight.status === "warning" ? "border-destructive/30 bg-destructive/5" :
                    "border-border bg-muted/10"
                  }`}
                >
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
          )}

          <DetailParagraph
            title="Summary Interpretation"
            detail={`This cohort analysis tracks ${summary.total_users.toLocaleString()} users across ${summary.total_cohorts} cohorts from ${summary.date_range}.

■ Cohort Type: ${summary.cohort_type.charAt(0).toUpperCase() + summary.cohort_type.slice(1)}
${summary.cohort_type === 'retention' 
  ? `Measures what percentage of users return in each period after signup. Essential for understanding product stickiness and identifying churn patterns.

Period 1 Retention: ${metrics.period_1_retention?.toFixed(1)}%
${metrics.period_1_retention && metrics.period_1_retention > 40 
  ? 'Strong first-period retention indicates good product-market fit. Users find value quickly and return.'
  : metrics.period_1_retention && metrics.period_1_retention > 20
  ? 'Moderate retention suggests room for improvement in onboarding and early engagement.'
  : 'Low retention indicates serious issues with value delivery or onboarding experience. Immediate action needed.'}

${metrics.long_term_retention 
  ? `Long-term Retention: ${metrics.long_term_retention.toFixed(1)}%
${metrics.long_term_retention > 20 
  ? 'Solid long-term retention shows strong user loyalty. Core user base is stable.'
  : 'Long-term retention opportunity exists. Focus on engagement loops and feature discovery.'}`
  : ''}`
  : summary.cohort_type === 'revenue'
  ? `Tracks revenue generated by each cohort over time to calculate customer lifetime value (LTV).

Total Revenue: $${metrics.total_revenue?.toLocaleString()}
Average per Cohort: $${metrics.avg_revenue_per_cohort?.toLocaleString()}

Revenue cohorts help identify which user groups are most valuable and project future LTV based on historical patterns.`
  : `Analyzes specific user actions (events) over time to understand engagement patterns and behavioral trends across cohorts.`
}

■ Actionable Recommendations
${summary.cohort_type === 'retention' && metrics.period_1_retention
  ? metrics.period_1_retention > 40
    ? '• Strong retention - focus on scaling acquisition channels\n• Identify what makes users stick and amplify those features\n• Consider premium features for power users'
    : metrics.period_1_retention > 20
    ? '• Improve onboarding flow to increase early activation\n• Add email/push re-engagement campaigns\n• Enhance core feature discovery'
    : '• Critical: fix onboarding immediately\n• Conduct user interviews to understand drop-off reasons\n• Simplify initial value delivery'
  : '• Compare cohorts over time to identify improving trends\n• Focus on high-value cohorts for retention efforts\n• Monitor seasonality effects on cohort behavior'
}`}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(5)}>
              Methodology
            </Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">
              View Full Report <ArrowRight className="w-4 h-4" />
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
            Understanding Cohort Methodology
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Cohort analysis groups users by signup period and tracks their behavior over time, revealing patterns invisible in aggregate metrics like whether retention is improving or revenue per user is increasing." />

          <div className="space-y-4">
            <h4 className="font-medium text-sm">Core Concepts</h4>
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Cohort Definition</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      A cohort is a group of users who share a common characteristic during a specific time period. 
                      Typically, cohorts are defined by signup date (e.g., all users who signed up in January 2024).
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground">
                        <strong>Example:</strong> January 2024 cohort = all users with first activity between Jan 1-31, 2024
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
                    <p className="font-medium text-sm mb-1">Period Index</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      The period index represents how many periods have elapsed since the cohort's start. Period 0 is 
                      the cohort's starting period, Period 1 is the next period, and so on.
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground font-mono">
                        Period Index = Current Period - Cohort Period<br/>
                        Example: User signup in Jan (Period 0), active in Mar (Period 2)
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
                    <p className="font-medium text-sm mb-1">Retention Calculation</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Retention rate measures what percentage of the original cohort remains active in each subsequent period.
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground font-mono">
                        Retention% = (Active Users in Period N / Total Cohort Size) × 100<br/>
                        Example: 60 active / 100 total = 60% retention
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <DetailParagraph
            title="Step-by-Step Process"
            detail={`The cohort analysis follows these steps to generate insights:

■ Step 1: Cohort Assignment
• Identify each user's first activity date (signup, first purchase, etc.)
• Group users by time period (weekly, monthly, or quarterly)
• Each group becomes a cohort (e.g., "2024-01" for January 2024 cohort)

■ Step 2: Activity Tracking
• For each subsequent period, check if user was active
• Active = any recorded event in that period (visit, purchase, etc.)
• Track which users from each cohort are active in each period

■ Step 3: Metric Calculation
${results.summary.cohort_type === 'retention' 
  ? `• Count active users in each period for each cohort
• Calculate retention: (Active / Total) × 100
• Create matrix: rows = cohorts, columns = periods since start
• Period 0 always shows 100% (cohort definition period)`
  : results.summary.cohort_type === 'revenue'
  ? `• Sum revenue for each cohort in each period
• Calculate average: Total Revenue / Cohort Size
• Calculate cumulative: Sum of revenue from Period 0 to Period N
• Track LTV (Lifetime Value) growth over time`
  : `• Count events for each cohort in each period
• Calculate average: Total Events / Cohort Size  
• Compare engagement levels across cohorts and time
• Identify behavioral patterns and trends`
}

■ Step 4: Visualization
• Heatmap: Color-code retention/revenue by intensity (green=high, red=low)
• Retention Curves: Line chart showing each cohort's trend over time
• Average Curve: Single line representing all cohorts' average
• Tables: Detailed numeric breakdown for precise analysis

■ Step 5: Insight Generation
• Compare recent vs older cohorts (are new cohorts better?)
• Identify retention cliff (where do users drop off?)
• Benchmark against industry standards
• Flag cohorts with unusual patterns for investigation`}
          />

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Reading the Heatmap</h4>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Horizontal Axis (Columns)
                </p>
                <p className="text-xs text-muted-foreground">
                  Represents periods since cohort start. Period 0 = signup period, Period 1 = next period, etc. 
                  Read left to right to see how one cohort evolves over time.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Vertical Axis (Rows)
                </p>
                <p className="text-xs text-muted-foreground">
                  Shows different cohorts by their start date. Newer cohorts at top, older at bottom. 
                  Read top to bottom to compare cohorts at the same period index.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <p className="font-medium text-sm mb-2">🟢 Diagonal Pattern</p>
                <p className="text-xs text-muted-foreground">
                  All cohorts follow similar retention curve. Indicates consistent product experience. 
                  Good if retention is high, concerning if universally low.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                <p className="font-medium text-sm mb-2">🔵 Improving Top Rows</p>
                <p className="text-xs text-muted-foreground">
                  Recent cohorts (top) show better retention than older cohorts (bottom). 
                  Excellent sign - your product improvements are working!
                </p>
              </div>

              <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                <p className="font-medium text-sm mb-2">🟡 Vertical Drop (Column 1)</p>
                <p className="text-xs text-muted-foreground">
                  Sharp decline from Period 0 to Period 1 across all cohorts. 
                  Indicates onboarding problem - users don't return after first visit.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="font-medium text-sm mb-2">🔴 Deteriorating Top Rows</p>
                <p className="text-xs text-muted-foreground">
                  Recent cohorts worse than older ones. Warning sign - recent changes or 
                  acquisition channels may be bringing lower-quality users.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Practical Applications</h4>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Product Development</p>
                <p className="text-xs text-muted-foreground">
                  Compare cohorts before/after feature launches. If post-launch cohorts show improved retention, 
                  the feature is working. If not, iterate or roll back.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Marketing Optimization</p>
                <p className="text-xs text-muted-foreground">
                  Separate cohorts by acquisition channel. If Facebook cohorts have 30% retention vs Google's 50%, 
                  shift budget accordingly or improve Facebook messaging.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Business Forecasting</p>
                <p className="text-xs text-muted-foreground">
                  Use recent cohort LTV curves to project future revenue. If Month 3 LTV is consistently $120, 
                  budget $120 for customer acquisition to maintain profitability.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Churn Prevention</p>
                <p className="text-xs text-muted-foreground">
                  Identify exactly when users churn (e.g., 70% drop between Period 1-2). Trigger re-engagement 
                  campaigns just before that period to prevent churn.
                </p>
              </div>
            </div>
          </div>

          <Card className="border-border bg-muted/10">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm mb-2">Important Considerations</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Sample Size:</strong> Small cohorts ({'<'}50 users) produce noisy, unreliable data</li>
                    <li>• <strong>Time Lag:</strong> Recent cohorts have fewer data points; only compare complete periods</li>
                    <li>• <strong>Seasonality:</strong> Holiday cohorts may behave differently than regular months</li>
                    <li>• <strong>External Events:</strong> Market changes, competitor actions affect all cohorts similarly</li>
                    <li>• <strong>Definition Consistency:</strong> Changing retention definition invalidates historical comparisons</li>
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

    const { summary, results: r, key_insights, visualizations } = results;
    const metrics = r.metrics;
    const cohortTable = r.cohort_table;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Cohort Analysis Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {results.summary.cohort_type.charAt(0).toUpperCase() + results.summary.cohort_type.slice(1)} Analysis | {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <MetricCard value={summary.total_cohorts} label="Cohorts" highlight />
              <MetricCard value={summary.total_users.toLocaleString()} label="Users" />
              {metrics.period_1_retention !== undefined && (
                <MetricCard value={`${metrics.period_1_retention.toFixed(1)}%`} label="P1 Retention" />
              )}
              {metrics.long_term_retention !== undefined && (
                <MetricCard value={`${metrics.long_term_retention.toFixed(1)}%`} label="LT Retention" />
              )}
              {metrics.total_revenue !== undefined && (
                <MetricCard value={`$${(metrics.total_revenue / 1000).toFixed(1)}K`} label="Revenue" />
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cohort analysis of {summary.total_users.toLocaleString()} users across {summary.total_cohorts} cohorts 
              from {summary.date_range}. {summary.cohort_type === 'retention' && metrics.period_1_retention
                ? `Period 1 retention averages ${metrics.period_1_retention.toFixed(1)}%, ${
                    metrics.period_1_retention > 40 ? 'indicating strong user engagement and product-market fit' :
                    metrics.period_1_retention > 20 ? 'showing moderate engagement with room for improvement' :
                    'suggesting significant onboarding and retention challenges'
                  }.`
                : summary.cohort_type === 'revenue'
                ? `Generated $${metrics.total_revenue?.toLocaleString()} total revenue with average $${metrics.avg_revenue_per_cohort?.toLocaleString()} per cohort.`
                : 'Behavioral patterns tracked across time periods.'}
            </p>
          </CardContent>
        </Card>

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
                    ins.status === "warning" ? "border-destructive/30 bg-destructive/5" :
                    ins.status === "positive" ? "border-primary/30 bg-primary/5" :
                    "border-border bg-muted/10"
                  }`}
                >
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
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Visualizations</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
              <TabsList className="mb-4 flex-wrap">
                {visualizations.retention_heatmap && <TabsTrigger value="retention_heatmap" className="text-xs">Heatmap</TabsTrigger>}
                {visualizations.retention_curves && <TabsTrigger value="retention_curves" className="text-xs">Curves</TabsTrigger>}
                {visualizations.avg_retention_curve && <TabsTrigger value="avg_retention_curve" className="text-xs">Avg Curve</TabsTrigger>}
                {visualizations.revenue_heatmap && <TabsTrigger value="revenue_heatmap" className="text-xs">Revenue</TabsTrigger>}
                {visualizations.cumulative_revenue && <TabsTrigger value="cumulative_revenue" className="text-xs">LTV</TabsTrigger>}
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

        {cohortTable && cohortTable.index && cohortTable.index.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cohort Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Cohort</TableHead>
                      {cohortTable.columns.map((col: number) => (
                        <TableHead key={col} className="text-right text-xs">P{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohortTable.index.map((cohort: string, idx: number) => (
                      <TableRow key={cohort}>
                        <TableCell className="text-xs font-medium">{cohort}</TableCell>
                        {cohortTable.data[idx].map((value: number, colIdx: number) => (
                          <TableCell 
                            key={colIdx} 
                            className={`text-right text-xs ${
                              value > 60 ? 'text-green-600 font-semibold' :
                              value > 40 ? 'text-blue-600' :
                              value > 20 ? 'text-yellow-600' :
                              value > 0 ? 'text-red-600' :
                              'text-muted-foreground'
                            }`}
                          >
                            {value > 0 ? `${value.toFixed(1)}%` : '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {metrics.retention_curve && metrics.retention_periods && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Retention Curve Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-3 mb-4">
                {metrics.retention_periods.slice(0, 9).map((period, idx) => (
                  <div key={period} className="p-3 rounded-lg border border-border bg-muted/10">
                    <p className="text-xs text-muted-foreground mb-1">Period {period}</p>
                    <p className="text-lg font-semibold">
                      {metrics.retention_curve![idx].toFixed(1)}%
                    </p>
                    {idx > 0 && metrics.retention_curve![idx - 1] > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {((metrics.retention_curve![idx] - metrics.retention_curve![idx - 1]) / metrics.retention_curve![idx - 1] * 100).toFixed(1)}% vs P{period - 1}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                  {summary.cohort_type === 'retention' && metrics.period_1_retention
                    ? metrics.period_1_retention > 40
                      ? <>
                          <li>• Strong retention - focus on scaling user acquisition</li>
                          <li>• Document what makes users stick for new features</li>
                          <li>• Consider premium offerings for power users</li>
                        </>
                      : metrics.period_1_retention > 20
                      ? <>
                          <li>• Improve onboarding flow to boost early activation</li>
                          <li>• Implement email/push re-engagement campaigns</li>
                          <li>• Enhance core feature discovery and education</li>
                        </>
                      : <>
                          <li>• Critical: redesign onboarding immediately</li>
                          <li>• Conduct user interviews to understand churn reasons</li>
                          <li>• Simplify path to first value delivery</li>
                        </>
                    : <>
                        <li>• Compare cohorts to identify improving trends</li>
                        <li>• Focus retention efforts on high-value cohorts</li>
                        <li>• Monitor seasonality effects on behavior</li>
                      </>
                  }
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Long-term Strategy</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Re-run cohort analysis monthly to track improvements</li>
                  <li>• Segment cohorts by acquisition channel for optimization</li>
                  <li>• Build predictive models based on cohort LTV patterns</li>
                  <li>• A/B test retention features on new cohorts</li>
                </ul>
              </div>
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
                This cohort analysis provides insights based on historical user behavior patterns. Results assume 
                consistent user experience, stable market conditions, and representative sampling. Cohort metrics 
                may be influenced by seasonality, external market factors, product changes, and acquisition channel 
                mix. Small cohorts ({'<'}50 users) may show higher variance. Always validate insights through 
                additional analysis and controlled experiments before making major strategic decisions.
              </p>
            </div>
          </CardContent>
        </Card>

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
            <BookOpen className="w-4 h-4" />
            Guide
          </Button>
        </div>
      )}
      
      <CohortGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
      
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

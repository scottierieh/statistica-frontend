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
  TrendingUp, Upload, ArrowRight, BookOpen, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, Settings, Activity, ChevronRight, AlertTriangle,
  Target, BarChart3, DollarSign, Tv, Radio, Globe,
  Megaphone, ShoppingCart, PieChart, LineChart, Percent,
  Calculator, Zap, TrendingDown, ArrowUpRight, Layers
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface ChannelContribution {
  channel: string;
  spend: number;
  spend_share: number;
  contribution: number;
  contribution_share: number;
  roi: number;
  cpa: number;
  efficiency_index: number;
}

interface MMMResult {
  success: boolean;
  results: {
    channel_contributions: ChannelContribution[];
    model_metrics: {
      r_squared: number;
      adj_r_squared: number;
      mape: number;
      rmse: number;
      dw_statistic?: number;
    };
    coefficients: Array<{ variable: string; coefficient: number; std_error: number; t_stat: number; p_value: number; significant: boolean }>;
    saturation_curves?: Array<{ channel: string; current_spend: number; optimal_spend: number; marginal_roi: number }>;
    adstock_params?: Array<{ channel: string; decay_rate: number; peak_effect: number; carryover_pct: number }>;
    budget_optimization?: {
      current_total: number;
      recommended_total: number;
      reallocation: Array<{ channel: string; current: number; recommended: number; change_pct: number }>;
      expected_lift: number;
    };
    decomposition: {
      base_sales: number;
      base_pct: number;
      marketing_contribution: number;
      marketing_pct: number;
      external_factors: number;
      external_pct: number;
    };
    weekly_data?: Array<{ period: string; actual: number; predicted: number; residual: number }>;
  };
  visualizations: {
    contribution_waterfall?: string;
    roi_comparison?: string;
    spend_vs_contribution?: string;
    saturation_curves?: string;
    actual_vs_predicted?: string;
    decomposition_chart?: string;
    adstock_decay?: string;
    budget_optimization?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    total_spend: number;
    total_revenue: number;
    overall_roi: number;
    data_periods: number;
    channels_analyzed: number;
  };
}

const MODEL_TYPES = [
  { value: "linear", label: "Linear Regression", desc: "Basic MMM model", icon: LineChart },
  { value: "adstock", label: "Adstock Model", desc: "With carryover effects", icon: Layers },
  { value: "saturation", label: "Saturation Model", desc: "With diminishing returns", icon: TrendingUp },
];

const CHANNEL_ICONS: { [key: string]: React.FC<{ className?: string }> } = {
  'TV': Tv, 'tv': Tv, 'Television': Tv,
  'Radio': Radio, 'radio': Radio,
  'Digital': Globe, 'digital': Globe, 'Online': Globe,
  'Social': Megaphone, 'social': Megaphone, 'Social Media': Megaphone,
  'Search': Target, 'search': Target, 'SEM': Target, 'PPC': Target,
  'Display': BarChart3, 'display': BarChart3,
  'Retail': ShoppingCart, 'retail': ShoppingCart, 'Promotion': ShoppingCart,
};

// Generate sample MMM data (weekly marketing spend and sales)
const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const startDate = new Date('2022-01-03'); // Start from first Monday of 2022
  
  // Base parameters
  const baseSales = 500000;
  const seasonality = [0.85, 0.9, 1.0, 1.1, 1.15, 1.2, 1.25, 1.2, 1.1, 1.0, 1.3, 1.5]; // Monthly seasonality
  
  // Channel effectiveness (coefficient * 1000 for readability)
  const channelEffects = {
    tv_spend: { coef: 3.2, saturation: 150000, adstock: 0.7 },
    digital_spend: { coef: 4.5, saturation: 80000, adstock: 0.3 },
    social_spend: { coef: 2.8, saturation: 50000, adstock: 0.4 },
    search_spend: { coef: 5.2, saturation: 60000, adstock: 0.2 },
    radio_spend: { coef: 1.8, saturation: 40000, adstock: 0.5 },
    print_spend: { coef: 1.2, saturation: 30000, adstock: 0.6 },
  };
  
  let prevAdstock: { [key: string]: number } = {};
  Object.keys(channelEffects).forEach(ch => prevAdstock[ch] = 0);
  
  for (let week = 0; week < 104; week++) { // 2 years of weekly data
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + week * 7);
    const month = currentDate.getMonth();
    
    // Generate spend with some randomness and patterns
    const isHoliday = (month === 10 || month === 11); // Nov-Dec holiday boost
    const isQ1 = (month <= 2);
    
    const tv_spend = Math.round((80000 + Math.random() * 70000) * (isHoliday ? 1.5 : 1) * (isQ1 ? 0.7 : 1));
    const digital_spend = Math.round(40000 + Math.random() * 40000 + (week % 4 === 0 ? 20000 : 0));
    const social_spend = Math.round(25000 + Math.random() * 25000);
    const search_spend = Math.round(30000 + Math.random() * 30000);
    const radio_spend = Math.round(15000 + Math.random() * 25000 * (isQ1 ? 0.5 : 1));
    const print_spend = Math.round(10000 + Math.random() * 20000 * (isHoliday ? 1.3 : 1));
    
    // Calculate adstock effects
    const spends: { [key: string]: number } = { tv_spend, digital_spend, social_spend, search_spend, radio_spend, print_spend };
    let marketingEffect = 0;
    
    Object.entries(channelEffects).forEach(([channel, params]) => {
      const currentSpend = spends[channel];
      const adstocked = currentSpend + prevAdstock[channel] * params.adstock;
      prevAdstock[channel] = adstocked;
      
      // Saturation effect (diminishing returns)
      const saturatedEffect = params.saturation * (1 - Math.exp(-adstocked / params.saturation));
      marketingEffect += saturatedEffect * params.coef / 1000;
    });
    
    // Calculate sales
    const seasonalFactor = seasonality[month];
    const trend = 1 + week * 0.001; // Slight upward trend
    const noise = 0.95 + Math.random() * 0.1;
    
    // External factors
    const competitor_index = 90 + Math.random() * 20; // 90-110
    const economic_index = 95 + Math.random() * 10 + (month >= 6 ? 5 : 0); // Slight improvement in H2
    const weather_index = month >= 4 && month <= 8 ? 105 : 95; // Summer boost
    
    const externalEffect = (competitor_index / 100) * (economic_index / 100) * (weather_index / 100);
    
    const sales = Math.round(
      (baseSales * seasonalFactor * trend + marketingEffect) * externalEffect * noise
    );
    
    const conversions = Math.round(sales / 150 + Math.random() * 100);
    
    data.push({
      date: currentDate.toISOString().split('T')[0],
      week_number: week + 1,
      sales,
      conversions,
      tv_spend,
      digital_spend,
      social_spend,
      search_spend,
      radio_spend,
      print_spend,
      total_spend: tv_spend + digital_spend + social_spend + search_spend + radio_spend + print_spend,
      competitor_index: Math.round(competitor_index),
      economic_index: Math.round(economic_index),
      weather_index: Math.round(weather_index),
    });
  }
  
  return data;
};

const MetricCard: React.FC<{ value: string | number; label: string; negative?: boolean; highlight?: boolean; sublabel?: string }> = ({ value, label, negative, highlight, sublabel }) => (
  <div className={`text-center p-4 rounded-lg border ${negative ? 'border-destructive/30 bg-destructive/5' : highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
    <p className={`text-2xl font-semibold ${negative ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
    {sublabel && <p className="text-xs text-muted-foreground/70 mt-0.5">{sublabel}</p>}
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
    const rows = data.map(row => columns.map(col => { const val = row[col]; if (val === null || val === undefined) return ''; if (typeof val === 'string' && val.includes(',')) return `"${val}"`; return val; }).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mmm_source_data.csv'; a.click();
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
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={downloadCSV}><Download className="w-3 h-3" />Download</Button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader><TableRow>{columns.slice(0, 8).map(col => <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{data.slice(0, 10).map((row, i) => <TableRow key={i}>{columns.slice(0, 8).map(col => <TableCell key={col} className="text-xs py-1.5">{row[col] !== null && row[col] !== undefined ? (typeof row[col] === 'number' ? Number(row[col]).toLocaleString() : String(row[col])) : '-'}</TableCell>)}</TableRow>)}</TableBody>
          </Table>
          {data.length > 10 && <p className="text-xs text-muted-foreground p-2 text-center">Showing first 10 of {data.length.toLocaleString()} rows</p>}
        </div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{ currentStep: number; hasResults: boolean; onStepClick: (step: number) => void }> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [{ num: 1, label: "Intro" }, { num: 2, label: "Config" }, { num: 3, label: "Validation" }, { num: 4, label: "Summary" }, { num: 5, label: "Methodology" }, { num: 6, label: "Report" }];
  return (
    <div className="flex items-center justify-center gap-0.5 mb-8 flex-wrap">
      {steps.map((step, idx) => {
        const isCompleted = step.num < currentStep; const isCurrent = step.num === currentStep; const isAccessible = step.num <= 3 || hasResults;
        return (
          <React.Fragment key={step.num}>
            <button onClick={() => isAccessible && onStepClick(step.num)} disabled={!isAccessible}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${isCurrent ? "bg-primary text-primary-foreground" : isCompleted ? "bg-primary/10 text-primary" : isAccessible ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"}`}>
              {step.label}
            </button>
            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// StatisticalGuide 컴포넌트 추가 (IntroPage 컴포넌트 바로 앞에 삽입)
const StatisticalGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Marketing Mix Modeling Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Marketing Mix Modeling (MMM)?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Marketing Mix Modeling is a statistical analysis technique that quantifies the impact of various marketing 
              activities on sales or other KPIs. MMM uses regression analysis to measure the effectiveness of different 
              marketing channels (TV, Digital, Social, etc.) and helps optimize budget allocation across channels to 
              maximize ROI and overall marketing effectiveness.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistical Models Used
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. Linear Regression (Basic MMM)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Quantify relationship between marketing spend and sales<br/>
                  <strong>Method:</strong> Multiple linear regression: Sales = β₀ + β₁×TV + β₂×Digital + ... + ε<br/>
                  <strong>Inputs:</strong> Sales/revenue, marketing spend by channel, control variables<br/>
                  <strong>Output:</strong> Channel coefficients (incremental sales per dollar spent)
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. Adstock Model (Carryover Effects)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Capture delayed and prolonged impact of advertising<br/>
                  <strong>Method:</strong> Geometric adstock transformation with decay parameter λ<br/>
                  <strong>Formula:</strong> Adstock(t) = Spend(t) + λ × Adstock(t-1)<br/>
                  <strong>Output:</strong> Decay rates showing how long ad effects persist (e.g., 0.7 = 70% carryover)
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. Saturation Model (Diminishing Returns)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Model non-linear response and identify optimal spend levels<br/>
                  <strong>Method:</strong> Hill/sigmoid transformation to capture saturation effects<br/>
                  <strong>Formula:</strong> Effect = Max × (Spend^α / (K^α + Spend^α))<br/>
                  <strong>Output:</strong> Saturation curves, optimal spend points, marginal ROI by spend level
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
                <p className="font-medium text-sm">Channel ROI (Return on Investment)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Incremental sales generated per dollar spent: ROI = Contribution / Spend. An ROI of 2.5x means $1 spent 
                  generates $2.50 in sales. ROI above 1.0 is profitable; above 3.0 indicates exceptional performance.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Marketing Contribution</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The portion of total sales directly attributed to marketing activities. This isolates marketing's impact 
                  from base demand and external factors (seasonality, economy, competition).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">R-Squared (R²)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Percentage of sales variation explained by the model (0-100%). Higher R² indicates better fit. 
                  80%+ is excellent, 60-80% is good, below 60% suggests missing variables or model issues.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">MAPE (Mean Absolute Percentage Error)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Average prediction error as a percentage. Lower is better. Below 10% is highly accurate, 
                  10-20% is acceptable, above 20% requires model refinement.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Saturation Point (K)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The spend level where 50% of maximum effectiveness is reached. Spending significantly beyond this 
                  point yields diminishing returns. Optimal spend is typically at or slightly above K.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Adstock Decay Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Percentage of previous period's advertising effect that carries forward. High decay (0.7-0.9) = 
                  long-lasting brand effects (TV). Low decay (0.2-0.4) = quick response channels (Search, Display).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Marginal ROI</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Return on the NEXT dollar spent (not average). Critical for budget optimization. Budget should 
                  flow to channels with highest marginal ROI until all channels reach equal marginal returns.
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
              <p><strong>High ROI + Low Spend Share:</strong> Underinvested channel with growth potential—test increased spend</p>
              <p><strong>High ROI + High Spend Share:</strong> Strong performer at scale—maintain investment, optimize creatives</p>
              <p><strong>Low ROI + High Spend Share:</strong> Oversaturated or inefficient—reduce spend and reallocate budget</p>
              <p><strong>Low ROI + Low Spend Share:</strong> Test at higher levels or eliminate—may lack strategic value</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Model Assumptions & Limitations
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Linearity (Basic Model):</strong> Assumes constant returns to scale—may not capture saturation effects</p>
              <p>• <strong>Data Quality:</strong> Garbage in, garbage out—requires accurate, complete data for all variables</p>
              <p>• <strong>Multicollinearity:</strong> Channels that always move together (e.g., TV + Radio) can distort coefficients</p>
              <p>• <strong>External Validity:</strong> Model trained on historical data may not predict unprecedented events</p>
              <p>• <strong>Aggregation Level:</strong> Weekly data is ideal; monthly masks short-term effects, daily adds noise</p>
              <p>• <strong>Control Variables:</strong> Missing key external factors (promotions, competitors) biases attribution</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Best Practices
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Data Preparation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use weekly aggregation for most categories</li>
                  <li>• Align spend and sales to same period</li>
                  <li>• Include at least 52-104 weeks of data</li>
                  <li>• Remove outliers and special events</li>
                  <li>• Ensure spend includes all costs (production, agency)</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Model Selection</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Start simple (linear) then add complexity</li>
                  <li>• Use adstock for brand channels (TV, Radio)</li>
                  <li>• Apply saturation when testing spend increases</li>
                  <li>• Include seasonality controls</li>
                  <li>• Account for promotional calendars</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Validation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Check R² {'>'} 0.7 for good explanatory power</li>
                  <li>• Validate with holdout period</li>
                  <li>• Test coefficient sign (positive for spend)</li>
                  <li>• Review residuals for patterns</li>
                  <li>• Compare predicted vs actual sales</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Application</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Refresh model quarterly or seasonally</li>
                  <li>• Use for budget allocation decisions</li>
                  <li>• Combine with attribution for full view</li>
                  <li>• Test optimized budgets incrementally</li>
                  <li>• Document assumptions and limitations</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Common Use Cases
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Budget Optimization</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Reallocate budget from low-ROI to high-ROI channels to maximize total sales within same budget. 
                  Use marginal ROI curves to find optimal spend per channel.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Incremental Budget Planning</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Model "what-if" scenarios for budget increases/decreases. Identify which channels to invest in 
                  if total budget grows by 10%, 20%, or 30%.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Channel Effectiveness Comparison</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Benchmark ROI across channels to identify top performers and underperformers. Justify strategic 
                  shifts in media mix with data-driven evidence.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Scenario Testing</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Test impact of removing/adding channels, changing spend levels, or responding to competitive actions. 
                  Quantify expected sales impact before making changes.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> MMM provides directional guidance based on historical 
              patterns, not absolute predictions. Results should be validated through controlled experiments when possible. 
              Market conditions, competitive dynamics, and consumer behavior can change, requiring regular model updates. 
              Use MMM as one input among multiple data sources (attribution, surveys, experiments) for holistic decision-making.
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
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><PieChart className="w-6 h-6 text-primary" /></div>
        <h1 className="text-2xl font-semibold">Marketing Mix Modeling (MMM)</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze the effectiveness of your marketing channels, measure ROI, understand saturation effects, and optimize budget allocation across TV, Digital, Social, Search, and other media.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {MODEL_TYPES.map((type) => (
          <div key={type.value} className="p-5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><type.icon className="w-5 h-5 text-primary" /></div>
              <div><p className="font-medium">{type.label}</p><p className="text-xs text-muted-foreground">{type.desc}</p></div>
            </div>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Info className="w-5 h-5 text-primary" />When to Use Marketing Mix Modeling</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Data Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Date/Period column (weekly recommended)",
                  "Sales or Revenue (dependent variable)",
                  "Marketing spend by channel (TV, Digital, etc.)",
                  "At least 52 weeks of data recommended",
                  "Optional: External factors (seasonality, competitors)"
                ].map((req) => (
                  <li key={req} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{req}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Analysis Outputs</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Channel contribution & ROI by media",
                  "Marketing effectiveness coefficients",
                  "Saturation curves & optimal spend levels",
                  "Budget reallocation recommendations",
                  "Sales decomposition (base vs. marketing)"
                ].map((res) => (
                  <li key={res} className="flex items-start gap-2"><TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />{res}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onLoadSample} className="gap-2"><Activity className="w-4 h-4" />Load Sample Data</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2"><Upload className="w-4 h-4" />Upload Your Data</Button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileUpload} className="hidden" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function MMMAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<MMMResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Configuration
  const [dateCol, setDateCol] = useState<string>("");
  const [salesCol, setSalesCol] = useState<string>("");
  const [spendCols, setSpendCols] = useState<string[]>([]);
  const [controlCols, setControlCols] = useState<string[]>([]);
  const [modelType, setModelType] = useState<string>("adstock");
  const [includeSeasonality, setIncludeSeasonality] = useState<boolean>(true);
  const [adstockMaxLag, setAdstockMaxLag] = useState<string>("8");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setDateCol("date");
    setSalesCol("sales");
    setSpendCols(["tv_spend", "digital_spend", "social_spend", "search_spend", "radio_spend", "print_spend"]);
    setControlCols(["competitor_index", "economic_index"]);
    setCurrentStep(2);
    setResults(null);
    setError(null);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const formData = new FormData(); formData.append("file", file);
    try {
      setLoading(true);
      const res = await fetch(`${FASTAPI_URL}/api/data/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      setData(result.data); setColumns(result.columns); setCurrentStep(2); setResults(null); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setLoading(false); }
  }, []);

  const toggleSpendCol = (col: string) => setSpendCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  const toggleControlCol = (col: string) => setControlCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  
  const numericColumns = columns.filter(col => {
    const sample = data[0]?.[col];
    return typeof sample === "number" || !isNaN(Number(sample));
  });
  
  const potentialSpendCols = numericColumns.filter(col => 
    col.toLowerCase().includes('spend') || 
    col.toLowerCase().includes('cost') || 
    col.toLowerCase().includes('budget') ||
    col.toLowerCase().includes('investment') ||
    col.toLowerCase().includes('tv') ||
    col.toLowerCase().includes('digital') ||
    col.toLowerCase().includes('social') ||
    col.toLowerCase().includes('search') ||
    col.toLowerCase().includes('radio') ||
    col.toLowerCase().includes('print') ||
    col.toLowerCase().includes('display') ||
    col.toLowerCase().includes('media')
  );

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const checks: ValidationCheck[] = [
      { name: "Data Loaded", passed: data.length > 0, message: data.length > 0 ? `${data.length.toLocaleString()} periods loaded` : "No data loaded" },
      { name: "Date Column", passed: !!dateCol, message: dateCol ? `Using: ${dateCol}` : "Select date/period column" },
      { name: "Sales Column", passed: !!salesCol, message: salesCol ? `Using: ${salesCol}` : "Select sales/revenue column" },
      { name: "Spend Columns", passed: spendCols.length >= 2, message: spendCols.length >= 2 ? `${spendCols.length} channels selected` : "Select at least 2 marketing channels" },
      { name: "Sufficient Data", passed: data.length >= 26, message: data.length >= 52 ? `${data.length} periods (excellent)` : data.length >= 26 ? `${data.length} periods (acceptable)` : `Only ${data.length} periods (need ≥26)` },
    ];
    return checks;
  }, [data, dateCol, salesCol, spendCols]);

  const runAnalysis = async () => {
    try {
      setLoading(true); setError(null);
      const payload = {
        data,
        date_col: dateCol,
        sales_col: salesCol,
        spend_cols: spendCols,
        control_cols: controlCols.length > 0 ? controlCols : null,
        model_type: modelType,
        include_seasonality: includeSeasonality,
        adstock_max_lag: parseInt(adstockMaxLag),
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/mmm`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) { 
        const errData = await res.json(); 
        throw new Error(errData.detail || "Analysis failed"); 
      }
      
      const result: MMMResult = await res.json();
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
    const contributions = results.results.channel_contributions;
    if (!contributions.length) return;
    const headers = Object.keys(contributions[0]).join(",");
    const rows = contributions.map(c => Object.values(c).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mmm_channel_analysis.csv"; a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement("a"); a.href = `data:image/png;base64,${base64}`; a.download = `mmm_${chartKey}.png`; a.click();
  };

  // Step 2: Config
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure MMM Analysis</CardTitle>
        <CardDescription>Set up marketing mix modeling parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Model Type</h4>
          <div className="grid md:grid-cols-3 gap-3">
            {MODEL_TYPES.map((type) => (
              <button key={type.value} onClick={() => setModelType(type.value)}
                className={`p-4 rounded-lg border text-left transition-all ${modelType === type.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                <type.icon className="w-5 h-5 text-primary mb-2" />
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.desc}</p>
              </button>
            ))}
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Required Columns</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date/Period Column *</Label>
              <Select value={dateCol || "__none__"} onValueChange={v => setDateCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- Select --</SelectItem>{columns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sales/Revenue Column *</Label>
              <Select value={salesCol || "__none__"} onValueChange={v => setSalesCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- Select --</SelectItem>{numericColumns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" />Marketing Spend Columns *</h4>
          <p className="text-xs text-muted-foreground">Select all columns containing marketing spend by channel (at least 2 required)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border rounded-lg bg-muted/10">
            {(potentialSpendCols.length > 0 ? potentialSpendCols : numericColumns).map((col) => (
              <div key={col} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${spendCols.includes(col) ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"}`} onClick={() => toggleSpendCol(col)}>
                <Checkbox checked={spendCols.includes(col)} />
                <span className="text-sm truncate">{col}</span>
              </div>
            ))}
          </div>
          {spendCols.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {spendCols.map(col => (
                <Badge key={col} variant="secondary" className="text-xs">{col}</Badge>
              ))}
            </div>
          )}
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Layers className="w-4 h-4 text-primary" />Control Variables (Optional)</h4>
          <p className="text-xs text-muted-foreground">External factors that affect sales but aren't marketing (seasonality, competitors, economy)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 border rounded-lg bg-muted/10">
            {numericColumns.filter(col => !spendCols.includes(col) && col !== salesCol).map((col) => (
              <div key={col} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${controlCols.includes(col) ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"}`} onClick={() => toggleControlCol(col)}>
                <Checkbox checked={controlCols.includes(col)} />
                <span className="text-sm truncate">{col}</span>
              </div>
            ))}
          </div>
        </div>
        
        {(modelType === "adstock" || modelType === "saturation") && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />Advanced Settings</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Checkbox checked={includeSeasonality} onCheckedChange={(c) => setIncludeSeasonality(!!c)} />
                  <div>
                    <Label>Include Seasonality</Label>
                    <p className="text-xs text-muted-foreground">Add monthly/weekly seasonal factors</p>
                  </div>
                </div>
                {modelType === "adstock" && (
                  <div className="space-y-2">
                    <Label>Adstock Max Lag (weeks)</Label>
                    <Input type="number" min="2" max="12" value={adstockMaxLag} onChange={(e) => setAdstockMaxLag(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Maximum carryover effect duration</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        
        <div className="flex justify-end pt-4">
          <Button onClick={() => setCurrentStep(3)} className="gap-2">
            Continue to Validation<ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Step 3: Validation
  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    const canRun = checks.every(c => c.passed);
    
    const totalSpend = data.reduce((sum, row) => {
      return sum + spendCols.reduce((s, col) => s + (Number(row[col]) || 0), 0);
    }, 0);
    
    const totalSales = data.reduce((sum, row) => sum + (Number(row[salesCol]) || 0), 0);
    
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-primary" />Data Validation</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {checks.map((check, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${check.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex items-center gap-3">
                  {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
                  <div><p className="font-medium text-sm">{check.name}</p><p className="text-xs text-muted-foreground">{check.message}</p></div>
                </div>
                <Badge variant={check.passed ? "secondary" : "destructive"} className="text-xs">{check.passed ? "Pass" : "Warning"}</Badge>
              </div>
            ))}
          </div>
          
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <div className="flex items-start gap-2"><Info className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Configuration Summary</p>
                <p className="text-muted-foreground">
                  Model: {MODEL_TYPES.find(t => t.value === modelType)?.label} • 
                  Sales: {salesCol} • 
                  Channels: {spendCols.length}
                  {controlCols.length > 0 && ` • Controls: ${controlCols.length}`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={data.length} label="Time Periods" />
            <MetricCard value={spendCols.length} label="Marketing Channels" />
            <MetricCard value={`$${(totalSpend / 1000000).toFixed(1)}M`} label="Total Marketing Spend" />
            <MetricCard value={`$${(totalSales / 1000000).toFixed(1)}M`} label="Total Sales" />
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
                <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Running MMM...</>
              ) : (
                <>Run Analysis<ArrowRight className="w-4 h-4" /></>
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
    const { summary, results: r } = results;
    const contributions = r.channel_contributions;
    const topChannels = [...contributions].sort((a, b) => b.roi - a.roi).slice(0, 3);
    const lowChannels = [...contributions].sort((a, b) => a.roi - b.roi).slice(0, 2);
    
    const decomp = r.decomposition;
    
    const finding = `Analysis of $${(summary.total_spend / 1000000).toFixed(1)}M marketing investment across ${summary.channels_analyzed} channels reveals an overall ROI of ${summary.overall_roi.toFixed(2)}x. ${topChannels[0].channel} delivers the highest ROI at ${topChannels[0].roi.toFixed(2)}x, while ${lowChannels[0].channel} shows the lowest efficiency at ${lowChannels[0].roi.toFixed(2)}x. Marketing activities contribute ${decomp.marketing_pct.toFixed(1)}% of total sales, with ${decomp.base_pct.toFixed(1)}% attributed to base demand.`;

    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" />MMM Analysis Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={`$${(summary.total_spend / 1000000).toFixed(1)}M`} label="Total Marketing Spend" />
            <MetricCard value={`$${(summary.total_revenue / 1000000).toFixed(1)}M`} label="Total Sales" highlight />
            <MetricCard value={`${summary.overall_roi.toFixed(2)}x`} label="Overall Marketing ROI" />
            <MetricCard value={`${(r.model_metrics.r_squared * 100).toFixed(1)}%`} label="Model R²" sublabel="Explanatory Power" />
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Sales Decomposition</h4>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-lg p-4 border border-border bg-muted/10">
                <ShoppingCart className="w-5 h-5 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Base Sales</p>
                <p className="text-2xl font-semibold">{decomp.base_pct.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">${(decomp.base_sales / 1000000).toFixed(1)}M</p>
              </div>
              <div className="rounded-lg p-4 border border-primary/30 bg-primary/5">
                <Megaphone className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Marketing Contribution</p>
                <p className="text-2xl font-semibold text-primary">{decomp.marketing_pct.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">${(decomp.marketing_contribution / 1000000).toFixed(1)}M</p>
              </div>
              <div className="rounded-lg p-4 border border-border bg-muted/10">
                <Globe className="w-5 h-5 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">External Factors</p>
                <p className="text-2xl font-semibold">{decomp.external_pct.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">${(decomp.external_factors / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Channel Performance (by ROI)</h4>
            <div className="grid md:grid-cols-3 gap-3">
              {topChannels.map((ch, idx) => {
                const IconComponent = CHANNEL_ICONS[ch.channel] || BarChart3;
                return (
                  <div key={ch.channel} className={`rounded-lg p-4 border ${idx === 0 ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/10'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <IconComponent className={`w-5 h-5 ${idx === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                      {idx === 0 && <Badge className="text-xs">Top Performer</Badge>}
                    </div>
                    <p className="text-sm font-medium">{ch.channel}</p>
                    <p className="text-2xl font-semibold">{ch.roi.toFixed(2)}x ROI</p>
                    <p className="text-xs text-muted-foreground">
                      ${(ch.spend / 1000).toFixed(0)}K spend → ${(ch.contribution / 1000).toFixed(0)}K contribution
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {results.key_insights.map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${insight.status === "positive" ? "border-primary/30 bg-primary/5" : insight.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/10"}`}>
                {insight.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : insight.status === "warning" ? <AlertCircle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 text-muted-foreground shrink-0" />}
                <div><p className="font-medium text-sm">{insight.title}</p><p className="text-sm text-muted-foreground">{insight.description}</p></div>
              </div>
            ))}
          </div>
          
          <DetailParagraph title="Summary Interpretation" detail={`This analysis used ${MODEL_TYPES.find(t => t.value === modelType)?.label} to analyze ${summary.data_periods} periods of marketing data.

■ Marketing Mix Modeling Overview
MMM is a statistical technique that quantifies the impact of various marketing inputs on sales or other KPIs. It helps answer key business questions:
• Which channels drive the most sales?
• What is the ROI of each marketing investment?
• How should budget be allocated across channels?
• What is the optimal spend level for each channel?

■ Model Quality Assessment
• R² = ${(r.model_metrics.r_squared * 100).toFixed(1)}%: The model explains ${(r.model_metrics.r_squared * 100).toFixed(1)}% of sales variation
  - Above 80%: Excellent model fit
  - 60-80%: Good model fit
  - Below 60%: Consider adding more variables
• MAPE = ${r.model_metrics.mape.toFixed(1)}%: Average prediction error
  - Below 10%: Highly accurate
  - 10-20%: Acceptable accuracy
  - Above 20%: Review model assumptions

■ Sales Decomposition Insights
Total sales are decomposed into three components:
• Base Sales (${decomp.base_pct.toFixed(1)}%): Organic demand without marketing
• Marketing Contribution (${decomp.marketing_pct.toFixed(1)}%): Sales driven by marketing
• External Factors (${decomp.external_pct.toFixed(1)}%): Seasonality, economy, competition

${decomp.marketing_pct > 30 ? 'Marketing shows strong influence on sales. Continue investment while optimizing channel mix.' : decomp.marketing_pct > 15 ? 'Marketing has moderate impact. Consider testing increased spend in high-ROI channels.' : 'Marketing contribution is relatively low. Investigate whether current messaging/targeting is effective.'}

■ Channel Performance Summary
Top performing channel: ${topChannels[0].channel} with ${topChannels[0].roi.toFixed(2)}x ROI
This channel converts $1 of spend into $${topChannels[0].roi.toFixed(2)} of incremental sales.

${lowChannels[0].roi < 1 ? `⚠️ ${lowChannels[0].channel} shows ROI below 1.0x, indicating negative returns. Consider reducing spend or improving creative/targeting.` : `Lowest performer: ${lowChannels[0].channel} at ${lowChannels[0].roi.toFixed(2)}x ROI, but still delivering positive returns.`}`} />
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">
              Understand Results<ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 5: Why
  const renderStep5Why = () => {
    if (!results) return null;
    const { results: r } = results;
    const contributions = r.channel_contributions;
    const coefficients = r.coefficients;
    
    const explanations = modelType === "linear" ? [
      { num: 1, title: "Linear Regression", content: "The basic MMM model uses multiple linear regression where Sales = β₀ + β₁×TV + β₂×Digital + ... + ε. Each β coefficient represents the incremental sales generated per unit of spend in that channel." },
      { num: 2, title: "Coefficient Interpretation", content: "A coefficient of 3.5 for TV means every $1 spent on TV generates $3.50 in incremental sales. Statistical significance (p-value < 0.05) indicates the relationship is reliable, not due to random chance." },
      { num: 3, title: "ROI Calculation", content: "ROI = (Incremental Sales from Channel) / (Spend on Channel). An ROI of 2.5x means the channel returns $2.50 for every $1 invested, representing a 150% return on investment." },
      { num: 4, title: "Limitations", content: "Linear models assume constant returns (no saturation) and no carryover effects. Real marketing often shows diminishing returns at high spend levels and lagged impact from brand advertising." },
    ] : modelType === "adstock" ? [
      { num: 1, title: "Adstock Transformation", content: "Adstock captures the carryover effect of advertising. Today's ad impact = Current Spend + Decay Rate × Yesterday's Adstock. A decay rate of 0.7 means 70% of the previous period's effect carries forward." },
      { num: 2, title: "Decay Rate Interpretation", content: "Higher decay rates (0.7-0.9) indicate longer-lasting effects, typical for brand advertising like TV. Lower rates (0.2-0.4) suggest quick decay, typical for performance channels like Search." },
      { num: 3, title: "Carryover Percentage", content: "Shows what portion of a channel's impact occurs after the initial spend period. TV might show 60% carryover (brand building), while Search shows only 20% (immediate response)." },
      { num: 4, title: "Half-Life Calculation", content: "Half-life = log(0.5) / log(decay_rate). For decay=0.7, half-life ≈ 2 weeks, meaning half the advertising effect dissipates in 2 weeks." },
    ] : [
      { num: 1, title: "Saturation/Hill Curve", content: "Sales response follows: Effect = Max_Effect × (Spend^α / (K^α + Spend^α)). This S-curve captures diminishing returns - initial spend is highly effective, but returns decrease as spend increases." },
      { num: 2, title: "Saturation Point (K)", content: "The spend level at which 50% of maximum effect is achieved. Spending well beyond this point yields minimal additional return. Optimal spend is typically near or just above K." },
      { num: 3, title: "Marginal ROI", content: "Unlike average ROI, marginal ROI measures the return on the NEXT dollar spent. As channels approach saturation, marginal ROI declines. Budget should flow to channels with highest marginal ROI." },
      { num: 4, title: "Optimal Spend Calculation", content: "The model identifies the spend level where marginal ROI equals 1.0 (or your target threshold). Beyond this point, each additional dollar returns less than $1, making reallocation more efficient." },
    ];

    const channelRecommendations: { [key: string]: { action: string; rationale: string; tactics: string[] } } = {
      'high_roi_low_spend': { action: 'Increase Investment', rationale: 'High ROI with low saturation indicates untapped potential', tactics: ['Test 20-30% spend increase', 'Expand reach/frequency', 'Test new ad formats'] },
      'high_roi_high_spend': { action: 'Maintain & Optimize', rationale: 'Strong performer at scale - protect this investment', tactics: ['Maintain current levels', 'Focus on creative refresh', 'A/B test for efficiency gains'] },
      'low_roi_high_spend': { action: 'Reduce & Reallocate', rationale: 'Oversaturated or inefficient - redirect budget', tactics: ['Cut spend 20-40%', 'Reallocate to high-ROI channels', 'Review targeting/creative'] },
      'low_roi_low_spend': { action: 'Test or Eliminate', rationale: 'Low efficiency even at low spend - question necessity', tactics: ['Run controlled test at higher spend', 'Evaluate strategic value', 'Consider elimination'] },
    };

    const avgRoi = contributions.reduce((s, c) => s + c.roi, 0) / contributions.length;
    const avgSpendShare = 100 / contributions.length;

    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><HelpCircle className="w-5 h-5 text-primary" />Understanding the Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={`The ${MODEL_TYPES.find(t => t.value === modelType)?.label} quantifies the relationship between marketing spend and sales, accounting for ${modelType === 'adstock' ? 'carryover effects over time' : modelType === 'saturation' ? 'diminishing returns at high spend levels' : 'the direct impact of each channel'}. Below you can review the methodology and channel-specific recommendations.`} />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Methodology Explanation</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {explanations.map((exp) => (
                <div key={exp.num} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">{exp.num}</div>
                    <div><p className="font-medium text-sm">{exp.title}</p><p className="text-xs text-muted-foreground mt-1 leading-relaxed">{exp.content}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Channel-Specific Recommendations</h4>
            <div className="space-y-3">
              {contributions.map((ch) => {
                const isHighRoi = ch.roi > avgRoi;
                const isHighSpend = ch.spend_share > avgSpendShare;
                let recKey: string;
                if (isHighRoi && !isHighSpend) recKey = 'high_roi_low_spend';
                else if (isHighRoi && isHighSpend) recKey = 'high_roi_high_spend';
                else if (!isHighRoi && isHighSpend) recKey = 'low_roi_high_spend';
                else recKey = 'low_roi_low_spend';
                
                const rec = channelRecommendations[recKey];
                const isGrowth = recKey.includes('high_roi');
                const isWarning = recKey === 'low_roi_high_spend';
                const IconComponent = CHANNEL_ICONS[ch.channel] || BarChart3;
                
                return (
                  <div key={ch.channel} className={`p-4 rounded-lg border ${isWarning ? 'border-destructive/30 bg-destructive/5' : isGrowth ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/10'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <IconComponent className={`w-5 h-5 ${isGrowth ? 'text-primary' : isWarning ? 'text-destructive' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="font-medium">{ch.channel}</p>
                          <p className="text-xs text-muted-foreground">ROI: {ch.roi.toFixed(2)}x • Spend Share: {ch.spend_share.toFixed(1)}% • Contribution: {ch.contribution_share.toFixed(1)}%</p>
                        </div>
                      </div>
                      <Badge variant={isWarning ? "destructive" : isGrowth ? "default" : "secondary"} className="text-xs">{rec.action}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{rec.rationale}</p>
                    <div className="flex flex-wrap gap-1">
                      {rec.tactics.map(tactic => (
                        <Badge key={tactic} variant="outline" className="text-xs">{tactic}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {coefficients && coefficients.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Statistical Coefficients</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variable</TableHead>
                      <TableHead className="text-right">Coefficient</TableHead>
                      <TableHead className="text-right">Std Error</TableHead>
                      <TableHead className="text-right">t-Statistic</TableHead>
                      <TableHead className="text-right">p-Value</TableHead>
                      <TableHead className="text-center">Significant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coefficients.map((coef, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{coef.variable}</TableCell>
                        <TableCell className="text-right font-mono">{coef.coefficient.toFixed(4)}</TableCell>
                        <TableCell className="text-right font-mono">{coef.std_error.toFixed(4)}</TableCell>
                        <TableCell className="text-right font-mono">{coef.t_stat.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{coef.p_value < 0.001 ? '<0.001' : coef.p_value.toFixed(3)}</TableCell>
                        <TableCell className="text-center">{coef.significant ? <CheckCircle2 className="w-4 h-4 text-primary mx-auto" /> : <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          
          <DetailParagraph title="Strategic Implications" detail={`Key principles for applying MMM insights to budget planning and optimization.

■ 1. Budget Reallocation Framework

【Immediate Actions (0-30 days)】
• Identify channels with ROI < 1.0x and reduce spend by 20-30%
• Reallocate freed budget to highest marginal ROI channels
• Set up measurement framework to track impact

【Short-Term Optimization (1-3 months)】
• Test increased spend on high-ROI, low-saturation channels
• Implement creative refresh on underperforming channels
• Review media mix across regions/segments

【Strategic Planning (3-12 months)】
• Use saturation curves to set channel-level budget caps
• Model scenario outcomes for different budget levels
• Integrate MMM insights with attribution data

■ 2. ROI Interpretation Guidelines

【ROI > 3.0x】 Exceptional performance
• Likely underspending - test aggressive increase
• Investigate scalability constraints
• Protect budget from cuts

【ROI 1.5-3.0x】 Strong performance
• Healthy channel - maintain or modestly increase
• Focus on efficiency optimization
• Good candidate for incremental budget

【ROI 1.0-1.5x】 Marginal performance
• Channel is profitable but barely
• Optimize before increasing spend
• Review creative, targeting, timing

【ROI < 1.0x】 Negative returns
• Losing money on this channel
• Cut significantly or eliminate
• Investigate root cause before reinvesting

■ 3. Common MMM Pitfalls

【Overfitting】
• Too many variables relative to data points
• Solution: Use regularization, reduce variable count

【Multicollinearity】
• Channels that always move together (e.g., TV and Radio)
• Solution: Combine correlated channels or use ridge regression

【Ignoring External Factors】
• Attributing seasonal sales to marketing
• Solution: Include seasonality, promotions, economic indicators

【Stale Models】
• Consumer behavior changes over time
• Solution: Refresh model quarterly or when market conditions shift

■ 4. Recommended Refresh Frequency

• Fast-moving consumer goods: Quarterly
• Retail/E-commerce: Quarterly (before key seasons)
• B2B/Long sales cycle: Semi-annually
• After major market changes: Immediately

When refreshing, compare with previous model to identify shifts in channel effectiveness over time.`} />
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">View Full Report<ArrowRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 6: Report
  const renderStep6Report = () => {
    if (!results) return null;
    const { summary, results: r, key_insights, visualizations } = results;
    const contributions = r.channel_contributions;
    const decomp = r.decomposition;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Marketing Mix Modeling Report</h1>
          <p className="text-sm text-muted-foreground mt-1">{MODEL_TYPES.find(t => t.value === modelType)?.label} | {new Date().toLocaleDateString()}</p>
        </div>
        
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={`$${(summary.total_spend / 1000000).toFixed(1)}M`} label="Marketing Spend" />
              <MetricCard value={`$${(summary.total_revenue / 1000000).toFixed(1)}M`} label="Total Sales" highlight />
              <MetricCard value={`${summary.overall_roi.toFixed(2)}x`} label="Overall ROI" />
              <MetricCard value={`${(r.model_metrics.r_squared * 100).toFixed(1)}%`} label="Model R²" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {MODEL_TYPES.find(t => t.value === modelType)?.label} analysis on {summary.data_periods} periods of data across {summary.channels_analyzed} marketing channels.
              Total marketing investment of ${(summary.total_spend / 1000000).toFixed(1)}M generated ${(decomp.marketing_contribution / 1000000).toFixed(1)}M in incremental sales ({decomp.marketing_pct.toFixed(1)}% of total).
              Model achieves {(r.model_metrics.r_squared * 100).toFixed(1)}% explanatory power with {r.model_metrics.mape.toFixed(1)}% average prediction error.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Key Insights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {key_insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : ins.status === "positive" ? "border-primary/30 bg-primary/5" : "border-border bg-muted/10"}`}>
                {ins.status === "warning" ? <AlertCircle className="w-4 h-4 text-destructive mt-0.5" /> : ins.status === "positive" ? <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" /> : <Info className="w-4 h-4 text-muted-foreground mt-0.5" />}
                <div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
              <TabsList className="mb-4 flex-wrap">
                {visualizations.contribution_waterfall && <TabsTrigger value="contribution_waterfall" className="text-xs">Contribution</TabsTrigger>}
                {visualizations.roi_comparison && <TabsTrigger value="roi_comparison" className="text-xs">ROI</TabsTrigger>}
                {visualizations.spend_vs_contribution && <TabsTrigger value="spend_vs_contribution" className="text-xs">Spend vs Contribution</TabsTrigger>}
                {visualizations.saturation_curves && <TabsTrigger value="saturation_curves" className="text-xs">Saturation</TabsTrigger>}
                {visualizations.actual_vs_predicted && <TabsTrigger value="actual_vs_predicted" className="text-xs">Fit</TabsTrigger>}
                {visualizations.decomposition_chart && <TabsTrigger value="decomposition_chart" className="text-xs">Decomposition</TabsTrigger>}
                {visualizations.adstock_decay && <TabsTrigger value="adstock_decay" className="text-xs">Adstock</TabsTrigger>}
                {visualizations.budget_optimization && <TabsTrigger value="budget_optimization" className="text-xs">Optimization</TabsTrigger>}
              </TabsList>
              {Object.entries(visualizations).map(([key, value]) => value && (
                <TabsContent key={key} value={key}>
                  <div className="relative border border-border rounded-lg overflow-hidden">
                    <img src={`data:image/png;base64,${value}`} alt={key} className="w-full" />
                    <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(key)}><Download className="w-4 h-4" /></Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Channel Performance Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Spend %</TableHead>
                  <TableHead className="text-right">Contribution</TableHead>
                  <TableHead className="text-right">Contribution %</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead className="text-right">Efficiency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.sort((a, b) => b.roi - a.roi).map((ch) => (
                  <TableRow key={ch.channel}>
                    <TableCell className="font-medium">{ch.channel}</TableCell>
                    <TableCell className="text-right">${(ch.spend / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-right">{ch.spend_share.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">${(ch.contribution / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-right">{ch.contribution_share.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-semibold">{ch.roi.toFixed(2)}x</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={ch.efficiency_index > 1.2 ? "default" : ch.efficiency_index < 0.8 ? "destructive" : "secondary"} className="text-xs">
                        {ch.efficiency_index > 1.2 ? 'High' : ch.efficiency_index < 0.8 ? 'Low' : 'Average'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <DetailParagraph title="Channel Metrics Interpretation" detail={`Understanding each metric in the channel performance table.

■ Spend & Spend Share
Total investment in each channel and its proportion of total marketing budget.
• Use to identify budget concentration
• Compare with Contribution % to assess efficiency

■ Contribution & Contribution Share
Incremental sales attributed to each channel through the MMM model.
• Contribution > Spend indicates positive ROI
• Share comparison reveals relative effectiveness

■ ROI (Return on Investment)
Sales generated per dollar spent: ROI = Contribution / Spend
• ROI > 1.0: Profitable channel
• ROI > 2.0: Strong performer
• ROI > 3.0: Exceptional - consider scaling

■ Efficiency Index
Normalized score comparing channel ROI to portfolio average.
• Index > 1.2: Above average efficiency (High)
• Index 0.8-1.2: Average efficiency
• Index < 0.8: Below average efficiency (Low)

Channels with high efficiency but low spend share are prime candidates for budget increase. Channels with low efficiency and high spend share should be reduced.`} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Model Statistics</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-sm mb-3">Model Fit Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 rounded bg-muted/20">
                    <span className="text-sm">R-Squared</span>
                    <span className="font-mono text-sm">{(r.model_metrics.r_squared * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted/20">
                    <span className="text-sm">Adjusted R-Squared</span>
                    <span className="font-mono text-sm">{(r.model_metrics.adj_r_squared * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted/20">
                    <span className="text-sm">MAPE</span>
                    <span className="font-mono text-sm">{r.model_metrics.mape.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted/20">
                    <span className="text-sm">RMSE</span>
                    <span className="font-mono text-sm">${r.model_metrics.rmse.toLocaleString()}</span>
                  </div>
                  {r.model_metrics.dw_statistic && (
                    <div className="flex justify-between p-2 rounded bg-muted/20">
                      <span className="text-sm">Durbin-Watson</span>
                      <span className="font-mono text-sm">{r.model_metrics.dw_statistic.toFixed(3)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-3">Sales Decomposition</h4>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 rounded bg-muted/20">
                    <span className="text-sm">Base Sales</span>
                    <span className="font-mono text-sm">${(decomp.base_sales / 1000000).toFixed(2)}M ({decomp.base_pct.toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-primary/10">
                    <span className="text-sm font-medium">Marketing Contribution</span>
                    <span className="font-mono text-sm">${(decomp.marketing_contribution / 1000000).toFixed(2)}M ({decomp.marketing_pct.toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted/20">
                    <span className="text-sm">External Factors</span>
                    <span className="font-mono text-sm">${(decomp.external_factors / 1000000).toFixed(2)}M ({decomp.external_pct.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {r.budget_optimization && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Budget Optimization Recommendation</CardTitle></CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <p className="font-medium">Expected Lift: +{r.budget_optimization.expected_lift.toFixed(1)}%</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  By reallocating the current ${(r.budget_optimization.current_total / 1000000).toFixed(1)}M budget according to marginal ROI optimization, 
                  an estimated {r.budget_optimization.expected_lift.toFixed(1)}% increase in marketing-driven sales is achievable.
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Recommended</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.budget_optimization.reallocation.map((item) => (
                    <TableRow key={item.channel}>
                      <TableCell className="font-medium">{item.channel}</TableCell>
                      <TableCell className="text-right">${(item.current / 1000).toFixed(0)}K</TableCell>
                      <TableCell className="text-right">${(item.recommended / 1000).toFixed(0)}K</TableCell>
                      <TableCell className="text-right">
                        <span className={item.change_pct > 0 ? 'text-primary' : item.change_pct < 0 ? 'text-destructive' : ''}>
                          {item.change_pct > 0 ? '+' : ''}{item.change_pct.toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.change_pct > 10 ? "default" : item.change_pct < -10 ? "destructive" : "secondary"} className="text-xs">
                          {item.change_pct > 10 ? 'Increase' : item.change_pct < -10 ? 'Decrease' : 'Maintain'}
                        </Badge>
                      </TableCell>
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
              This report is a decision-making support tool derived from statistical algorithms. 
              The analysis provides probabilistic estimates based on historical data; actual results 
              may vary depending on data integrity and unpredictable market variables. This information 
              does not guarantee specific outcomes, and the final responsibility for any decisions 
              rests solely with the user.
            </p>
          </div>
        </CardContent>
      </Card>

        
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV (Channel Data)</Button>
              {Object.entries(visualizations).map(([key, value]) => value && (
                <Button key={key} variant="outline" onClick={() => handleDownloadPNG(key)} className="gap-2">
                  <Download className="w-4 h-4" />{key.replace(/_/g, ' ')}
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
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}
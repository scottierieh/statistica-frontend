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
  ChevronRight, DollarSign, Users, Calendar, Target,
  Sparkles, AlertTriangle, BookMarked, Clock, Percent
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface CLVResult {
  success: boolean;
  results: {
    customer_clv: Array<{
      customer_id: string;
      frequency: number;
      recency: number;
      T: number;
      monetary_value: number;
      predicted_purchases: number;
      predicted_clv: number;
      probability_alive: number;
      customer_segment: string;
      total_historical_revenue: number;
      avg_order_value: number;
    }>;
    metrics: {
      total_customers: number;
      total_revenue: number;
      avg_clv: number;
      median_clv: number;
      total_predicted_clv: number;
      avg_frequency: number;
      avg_monetary_value: number;
      model_quality_score: number;
      high_value_customers: number;
      at_risk_customers: number;
    };
  };
  visualizations: {
    clv_distribution?: string;
    frequency_monetary_scatter?: string;
    customer_segmentation?: string;
    top_customers?: string;
    probability_alive_distribution?: string;
    clv_by_segment?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    total_customers: number;
    avg_clv: number;
    total_predicted_clv: number;
    forecast_period_months: number;
  };
}

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const numCustomers = 200;
  const customers = Array.from({ length: numCustomers }, (_, i) => `CUST_${String(i + 1).padStart(4, '0')}`);
  
  // Generate transaction history over 2 years
  const startDate = new Date('2023-01-01');
  const endDate = new Date('2024-12-31');
  
  customers.forEach(customer_id => {
    // Customer behavior parameters
    const avgPurchaseInterval = 20 + Math.random() * 60; // Days between purchases
    const baseOrderValue = 20 + Math.random() * 200;
    const numPurchases = Math.floor(1 + Math.random() * 15);
    const churnProbability = Math.random();
    
    let currentDate = new Date(startDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < numPurchases; i++) {
      // Stop generating if customer churned
      if (i > 3 && churnProbability > 0.7 && Math.random() > 0.5) {
        break;
      }
      
      const orderValue = baseOrderValue * (0.7 + Math.random() * 0.6);
      
      data.push({
        customer_id,
        transaction_date: currentDate.toISOString().split('T')[0],
        revenue: parseFloat(orderValue.toFixed(2))
      });
      
      // Move to next purchase date
      const daysToAdd = avgPurchaseInterval * (0.5 + Math.random());
      currentDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      
      // Stop if we've reached the end date
      if (currentDate > endDate) {
        break;
      }
    }
  });
  
  return data.sort((a, b) => 
    new Date(a.transaction_date as string).getTime() - new Date(b.transaction_date as string).getTime()
  );
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
    a.download = 'clv_source_data.csv';
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
            <h2 className="text-lg font-semibold">Customer Lifetime Value Forecasting Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Customer Lifetime Value?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Customer Lifetime Value (CLV) predicts the total revenue a customer will generate over their entire 
              relationship with your business. This analysis helps prioritize high-value customers, optimize marketing 
              spend, and forecast future revenue streams.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Forecasting Methodology
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">BG/NBD Model (Purchase Frequency)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Predicts future number of transactions<br/>
                  <strong>Method:</strong> Beta-Geometric/Negative Binomial Distribution<br/>
                  <strong>Inputs:</strong> Recency, Frequency, T (customer age)<br/>
                  <strong>Output:</strong> Expected purchases in next N months
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Gamma-Gamma Model (Monetary Value)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Predicts average transaction value<br/>
                  <strong>Method:</strong> Gamma-Gamma probability distribution<br/>
                  <strong>Assumption:</strong> Transaction value varies around customer mean<br/>
                  <strong>Output:</strong> Expected average order value
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">CLV Calculation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Formula:</strong> CLV = Expected Purchases × Expected Order Value<br/>
                  <strong>Adjustments:</strong> Probability customer is still active<br/>
                  <strong>Time Horizon:</strong> Customizable forecast period (1-36 months)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Customer Segmentation
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">High Value</p>
                <p className="text-xs text-muted-foreground mt-1">
                  High predicted CLV and high probability of being active. Top priority for retention programs, 
                  VIP treatment, and personalized engagement.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Medium Value</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Moderate CLV with decent activity probability. Growth opportunities through upselling, 
                  cross-selling, and engagement programs.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Low Value</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lower predicted value but still active. Cost-effective marketing approaches, 
                  automated campaigns, and efficiency focus.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">At Risk</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Low probability of being active. Immediate re-engagement needed: win-back campaigns, 
                  special offers, feedback surveys to understand churn reasons.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">New Customer</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Single purchase, not enough history. Onboarding programs, second-purchase incentives, 
                  and early engagement critical for retention.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Strategic Applications
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Marketing ROI</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Set customer acquisition cost limits based on CLV</li>
                  <li>• Allocate marketing budget by segment value</li>
                  <li>• Calculate campaign ROI expectations</li>
                  <li>• Identify high-value acquisition channels</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Retention Strategy</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Prioritize retention by customer value</li>
                  <li>• Design tiered loyalty programs</li>
                  <li>• Identify churn risk before it happens</li>
                  <li>• Personalize engagement by segment</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Financial Planning</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Forecast future revenue streams</li>
                  <li>• Understand customer base health</li>
                  <li>• Set realistic growth targets</li>
                  <li>• Assess business valuation metrics</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Product Development</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Identify features high-value customers want</li>
                  <li>• Prioritize improvements by segment impact</li>
                  <li>• Design premium offerings for top tier</li>
                  <li>• Reduce churn through product enhancements</li>
                </ul>
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
              <p>• <strong>Stable Behavior:</strong> Assumes past purchasing patterns continue into future</p>
              <p>• <strong>Transaction Independence:</strong> Each purchase independent of others</p>
              <p>• <strong>Homogeneous Population:</strong> Customers within segments behave similarly</p>
              <p>• <strong>No External Shocks:</strong> No major market disruptions or competitive changes</p>
              <p>• <strong>Requires History:</strong> Needs multiple transactions per customer for accuracy</p>
              <p>• <strong>Contractual vs Non-Contractual:</strong> Best for non-contractual settings (e-commerce, retail)</p>
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
                  <li>• Minimum 50+ customers</li>
                  <li>• At least 6 months history</li>
                  <li>• Multiple transactions per customer</li>
                  <li>• Accurate revenue data</li>
                  <li>• Consistent time periods</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Implementation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Start with 12-month forecasts</li>
                  <li>• Validate against actual performance</li>
                  <li>• Update forecasts quarterly</li>
                  <li>• Segment by product category</li>
                  <li>• Monitor model quality scores</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Action Planning</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Set CAC limits at 20-30% of CLV</li>
                  <li>• Create segment-specific programs</li>
                  <li>• Re-engage at-risk customers early</li>
                  <li>• Reward high-value loyalty</li>
                  <li>• Test initiatives by segment</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Validation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Check model quality score</li>
                  <li>• Compare predictions vs actuals</li>
                  <li>• Monitor segment stability</li>
                  <li>• Track re-engagement success</li>
                  <li>• Adjust for market changes</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> CLV forecasts are probabilistic estimates based on 
              historical behavior patterns. Accuracy depends on data quality, market stability, and customer behavior 
              consistency. Use forecasts as decision-support tools, not absolute predictions. Regular validation 
              against actual results is essential for maintaining forecast accuracy.
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
          <DollarSign className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Customer Lifetime Value Forecasting</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Predict future customer value using probabilistic models. Calculate expected revenue per customer, 
          identify high-value segments, assess churn risk, and optimize marketing investments based on 
          lifetime value predictions.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">BG/NBD Modeling</p>
              <p className="text-xs text-muted-foreground">Purchase prediction</p>
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
              <p className="text-xs text-muted-foreground">Value-based grouping</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Revenue Forecasting</p>
              <p className="text-xs text-muted-foreground">Future value projection</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use CLV Forecasting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Customer ID column",
                  "Transaction date column",
                  "Revenue/order value column",
                  "At least 50 customers",
                  "Minimum 6 months of history"
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
                  "Predicted CLV for each customer",
                  "Customer segmentation by value",
                  "Churn risk identification",
                  "Expected purchase frequency",
                  "Marketing ROI optimization guidance"
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

export default function CLVForecastingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<CLVResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const [customerCol, setCustomerCol] = useState<string>("");
  const [dateCol, setDateCol] = useState<string>("");
  const [revenueCol, setRevenueCol] = useState<string>("");
  const [forecastMonths, setForecastMonths] = useState<number>(12);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setCustomerCol("customer_id");
    setDateCol("transaction_date");
    setRevenueCol("revenue");
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
    const uniqueCustomers = new Set(data.map(d => d[customerCol])).size;
    
    // Count transactions per customer
    const customerCounts: { [key: string]: number } = {};
    data.forEach(row => {
      const cid = String(row[customerCol]);
      customerCounts[cid] = (customerCounts[cid] || 0) + 1;
    });
    const repeatCustomers = Object.values(customerCounts).filter(count => count > 1).length;
    const avgTransactions = Object.values(customerCounts).reduce((a, b) => a + b, 0) / Object.keys(customerCounts).length;
    
    // Check date range
    let hasDateRange = false;
    let daySpan = 0;
    if (dateCol) {
      const dates = data.map(d => new Date(d[dateCol] as string).getTime()).filter(d => !isNaN(d));
      if (dates.length > 0) {
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);
        daySpan = (maxDate - minDate) / (1000 * 60 * 60 * 24);
        hasDateRange = daySpan >= 180; // At least 6 months
      }
    }
    
    const checks: ValidationCheck[] = [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 
          ? `${data.length.toLocaleString()} transactions loaded` 
          : "No data loaded"
      },
      {
        name: "Customer Column",
        passed: !!customerCol,
        message: customerCol 
          ? `${uniqueCustomers.toLocaleString()} unique customers` 
          : "Select customer column"
      },
      {
        name: "Date Column",
        passed: !!dateCol,
        message: dateCol 
          ? `Using: ${dateCol}` 
          : "Select date column"
      },
      {
        name: "Revenue Column",
        passed: !!revenueCol,
        message: revenueCol 
          ? `Using: ${revenueCol}` 
          : "Select revenue column"
      },
      {
        name: "Sufficient Customers",
        passed: uniqueCustomers >= 50,
        message: uniqueCustomers >= 100
          ? `${uniqueCustomers} customers (excellent)`
          : uniqueCustomers >= 50
          ? `${uniqueCustomers} customers (acceptable)`
          : `Only ${uniqueCustomers} customers (need ≥50)`
      },
      {
        name: "Repeat Customers",
        passed: repeatCustomers >= 20,
        message: repeatCustomers >= 50
          ? `${repeatCustomers} repeat customers (excellent)`
          : repeatCustomers >= 20
          ? `${repeatCustomers} repeat customers (acceptable)`
          : `Only ${repeatCustomers} repeat customers (need ≥20)`
      },
      {
        name: "Historical Data Range",
        passed: hasDateRange,
        message: hasDateRange
          ? `${Math.floor(daySpan / 30)} months of history`
          : dateCol
          ? `Only ${Math.floor(daySpan / 30)} months (need ≥6 months)`
          : "Date column not selected"
      }
    ];
    
    return checks;
  }, [data, customerCol, dateCol, revenueCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        customer_col: customerCol,
        date_col: dateCol,
        revenue_col: revenueCol,
        forecast_months: forecastMonths
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/clv-forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: CLVResult = await res.json();
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
    const customers = results.results.customer_clv;
    if (!customers.length) return;
    
    const headers = Object.keys(customers[0]).join(",");
    const rows = customers.map(c => Object.values(c).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "clv_forecast_results.csv";
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${base64}`;
    a.download = `clv_${chartKey}.png`;
    a.click();
  };

  // Step 2: Configuration
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure CLV Forecasting
        </CardTitle>
        <CardDescription>Set up customer lifetime value analysis parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Required Columns
          </h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Customer ID *</Label>
              <Select value={customerCol || "__none__"} onValueChange={v => setCustomerCol(v === "__none__" ? "" : v)}>
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
              <Label>Transaction Date *</Label>
              <Select value={dateCol || "__none__"} onValueChange={v => setDateCol(v === "__none__" ? "" : v)}>
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
              <Label>Revenue *</Label>
              <Select value={revenueCol || "__none__"} onValueChange={v => setRevenueCol(v === "__none__" ? "" : v)}>
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
        </div>

        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Forecast Parameters
          </h4>
          <div className="space-y-2">
            <Label>Forecast Period (Months)</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={forecastMonths}
                onChange={(e) => setForecastMonths(Math.min(36, Math.max(1, parseInt(e.target.value) || 12)))}
                min={1}
                max={36}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                Predict customer value over the next {forecastMonths} months
              </span>
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
                  Customer: {customerCol} • Date: {dateCol} • Revenue: {revenueCol} • 
                  Forecast: {forecastMonths} months
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
                  Forecasting...
                </>
              ) : (
                <>
                  Run CLV Forecast
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
    const metrics = r.metrics;
    
    const finding = `Analysis of ${summary.total_customers} customers predicts an average lifetime value of $${summary.avg_clv.toFixed(2)} over ${summary.forecast_period_months} months. ${metrics.high_value_customers} customers are classified as high-value, while ${metrics.at_risk_customers} customers are at risk of churning. Total predicted revenue: $${summary.total_predicted_clv.toLocaleString()}.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            CLV Forecast Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              value={summary.total_customers}
              label="Total Customers"
              icon={Users}
              highlight
            />
            <MetricCard
              value={`$${summary.avg_clv.toFixed(0)}`}
              label="Avg CLV"
              icon={DollarSign}
            />
            <MetricCard
              value={`$${(summary.total_predicted_clv / 1000).toFixed(0)}K`}
              label="Total Predicted CLV"
              icon={TrendingUp}
            />
            <MetricCard
              value={`${summary.forecast_period_months}mo`}
              label="Forecast Period"
              icon={Calendar}
            />
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Customer Segmentation</h4>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-lg p-4 border border-border bg-muted/10">
                <Target className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-medium">High Value</p>
                <p className="text-2xl font-semibold">{metrics.high_value_customers}</p>
                <p className="text-xs text-muted-foreground">
                  {((metrics.high_value_customers / metrics.total_customers) * 100).toFixed(1)}% of customers
                </p>
              </div>

              <div className="rounded-lg p-4 border border-border bg-muted/10">
                <AlertTriangle className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-medium">At Risk</p>
                <p className="text-2xl font-semibold">{metrics.at_risk_customers}</p>
                <p className="text-xs text-muted-foreground">
                  {((metrics.at_risk_customers / metrics.total_customers) * 100).toFixed(1)}% of customers
                </p>
              </div>

              <div className="rounded-lg p-4 border border-border bg-muted/10">
                <Percent className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-medium">Model Quality</p>
                <p className="text-2xl font-semibold">{(metrics.model_quality_score * 100).toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Forecast reliability</p>
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
            detail={`This customer lifetime value forecast uses BG/NBD and Gamma-Gamma probabilistic models to predict future customer behavior and revenue over ${summary.forecast_period_months} months.

■ Average Predicted CLV: $${summary.avg_clv.toFixed(2)}
The average customer is expected to generate $${summary.avg_clv.toFixed(2)} in revenue over the next ${summary.forecast_period_months} months. This metric helps set customer acquisition cost (CAC) limits and evaluate marketing ROI. As a rule of thumb, CAC should be 20-30% of CLV.

■ Total Revenue Forecast: $${summary.total_predicted_clv.toLocaleString()}
Based on current customer base behavior, the model predicts total revenue of $${summary.total_predicted_clv.toLocaleString()} from existing customers over the forecast period. This provides a baseline for financial planning and growth targets.

■ Customer Segmentation
• High Value (${metrics.high_value_customers}): These customers have strong predicted CLV and high probability of remaining active. Prioritize retention programs, VIP treatment, and personalized engagement for this segment.
• At Risk (${metrics.at_risk_customers}): Low probability of continued activity. Implement immediate re-engagement campaigns, special offers, and feedback surveys to understand and address churn reasons.

■ Model Quality: ${(metrics.model_quality_score * 100).toFixed(0)}%
${metrics.model_quality_score > 0.7
  ? `High reliability. The model demonstrates strong predictive power based on customer history and behavior patterns. CLV forecasts can be confidently used for strategic planning.`
  : metrics.model_quality_score > 0.5
  ? `Moderate reliability. The model provides reasonable estimates but should be validated against actual performance. Consider collecting more transaction history for improved accuracy.`
  : `Limited reliability. Predictions should be used cautiously as decision-support tools only. The model may be constrained by limited historical data or irregular customer behavior patterns.`}

■ Strategic Implications
Based on the ${summary.forecast_period_months}-month forecast, focus retention efforts on the ${metrics.high_value_customers} high-value customers who drive a disproportionate share of predicted revenue. Address the ${metrics.at_risk_customers} at-risk customers through targeted re-engagement before they churn completely. Use average CLV of $${summary.avg_clv.toFixed(2)} to set customer acquisition budgets and evaluate marketing channel efficiency.`}
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

  // Step 5: Methodology
  const renderStep5Methodology = () => {
    if (!results) return null;

    const explanations = [
      {
        num: 1,
        title: "BG/NBD Model",
        content: "Beta-Geometric/Negative Binomial Distribution model predicts future purchase frequency. Uses Recency (last purchase), Frequency (number of purchases), and T (customer age) to estimate probability of future transactions. Accounts for customer dropout through probabilistic modeling."
      },
      {
        num: 2,
        title: "Gamma-Gamma Model",
        content: "Predicts average transaction value for each customer. Assumes transaction amounts vary randomly around a customer-specific mean. Only applies to customers with repeat purchases (frequency > 0). New customers use population average until they make additional purchases."
      },
      {
        num: 3,
        title: "CLV Calculation",
        content: "CLV = Expected Purchases × Expected Transaction Value × Probability Alive. Combines purchase frequency prediction with monetary value forecast, adjusted by probability the customer is still active. Provides realistic estimate of future customer revenue."
      },
      {
        num: 4,
        title: "Segmentation Logic",
        content: `Customers classified based on predicted CLV and activity probability. High Value: Top quartile CLV + >50% alive. At Risk: <20% alive. New: Single purchase. Medium/Low Value: Remaining customers by CLV level. Model quality: ${(results.results.metrics.model_quality_score * 100).toFixed(0)}%.`
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
          <FindingBox finding="CLV forecasting uses probabilistic models (BG/NBD and Gamma-Gamma) to predict customer purchase behavior and lifetime value. These models are widely used in subscription businesses, e-commerce, and retail for customer analytics." />

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
            <h4 className="font-medium text-sm">Strategic Action Framework</h4>
            <div className="space-y-3">
              {[
                {
                  segment: "High Value Customers",
                  strategy: "Retention & Growth",
                  tactics: ["VIP loyalty programs", "Exclusive early access", "Personalized service", "Premium offerings"],
                  goal: "Maximize lifetime value and prevent churn of most valuable customers"
                },
                {
                  segment: "At Risk Customers",
                  strategy: "Re-engagement",
                  tactics: ["Win-back campaigns", "Special reactivation offers", "Feedback surveys", "Product recommendations"],
                  goal: "Recover churning customers before they become inactive permanently"
                },
                {
                  segment: "New Customers",
                  strategy: "Onboarding & Conversion",
                  tactics: ["Welcome series", "Second purchase incentives", "Educational content", "Easy returns policy"],
                  goal: "Convert one-time buyers into repeat customers through positive early experiences"
                },
                {
                  segment: "Medium/Low Value",
                  strategy: "Efficiency & Automation",
                  tactics: ["Automated email campaigns", "Self-service options", "Targeted promotions", "Referral programs"],
                  goal: "Maintain engagement cost-effectively while seeking opportunities for value growth"
                }
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="mb-2">
                    <p className="font-medium">{item.segment}</p>
                    <p className="text-xs text-muted-foreground">{item.goal}</p>
                  </div>
                  <p className="text-xs font-medium text-primary mb-2">Strategy: {item.strategy}</p>
                  <div className="flex flex-wrap gap-1">
                    {item.tactics.map(tactic => (
                      <Badge key={tactic} variant="outline" className="text-xs">
                        {tactic}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DetailParagraph
            title="Implementation Roadmap"
            detail={`Step-by-step guide for implementing CLV-based customer strategies.

■ Phase 1: Analysis & Segmentation (Week 1-2)
• Run CLV forecast on transaction history
• Validate model quality score (target >50%)
• Identify high-value and at-risk segments
• Calculate customer acquisition cost limits (20-30% of CLV)

■ Phase 2: Strategy Development (Week 3-4)
• High Value: Design VIP retention programs
• At Risk: Create win-back campaign sequences
• New Customers: Build onboarding workflows
• Set segment-specific KPIs and success metrics

■ Phase 3: Campaign Execution (Week 5-8)
• Launch retention program for high-value segment
• Deploy re-engagement emails to at-risk customers
• Implement new customer welcome series
• Test different messaging and offers by segment

■ Phase 4: Measurement & Optimization (Week 9-12)
• Track actual CLV vs predicted values
• Measure campaign response rates by segment
• Calculate ROI on retention investments
• Refine segmentation thresholds based on results

■ Ongoing: Monitoring & Refinement
• Re-run CLV forecast quarterly
• Update strategies as customer behavior evolves
• Expand to product-level or channel-level analysis
• Build predictive models for segment transitions

■ Key Success Metrics
• Actual vs predicted CLV accuracy
• High-value customer retention rate
• At-risk customer reactivation rate
• Marketing ROI by customer segment
• Customer acquisition cost efficiency

■ Common Pitfalls to Avoid
• Overspending on low-value customers
• Ignoring at-risk signals until too late
• One-size-fits-all marketing approaches
• Not validating model predictions with actuals
• Neglecting new customer onboarding
• Setting unrealistic CAC limits`}
          />

          <Card className="border-border bg-muted/10">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm mb-2">Disclaimer</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This report provides probabilistic estimates based on historical customer behavior patterns. 
                    CLV forecasts are decision-support tools and should not be interpreted as guaranteed outcomes. 
                    Actual results depend on market conditions, competitive dynamics, and execution quality. 
                    Regular validation against actual performance is essential for maintaining forecast accuracy.
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

  // Step 6: Report
  const renderStep6Report = () => {
    if (!results) return null;

    const { summary, results: r, key_insights, visualizations } = results;
    const customers = r.customer_clv.slice(0, 20);
    const metrics = r.metrics;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Customer Lifetime Value Forecast Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Probabilistic Revenue Prediction | {summary.forecast_period_months}-Month Forecast | {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={summary.total_customers} label="Customers" highlight />
              <MetricCard value={`$${summary.avg_clv.toFixed(0)}`} label="Avg CLV" />
              <MetricCard value={`$${(summary.total_predicted_clv / 1000).toFixed(0)}K`} label="Total Predicted" />
              <MetricCard value={`${summary.forecast_period_months}mo`} label="Forecast Period" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              CLV forecast performed on {summary.total_customers} customers using BG/NBD and Gamma-Gamma probabilistic models. 
              Average predicted CLV: ${summary.avg_clv.toFixed(2)} over {summary.forecast_period_months} months. 
              Total predicted revenue: ${summary.total_predicted_clv.toLocaleString()}. {metrics.high_value_customers} high-value 
              customers identified, {metrics.at_risk_customers} at risk of churn.
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
                {visualizations.clv_distribution && <TabsTrigger value="clv_distribution" className="text-xs">CLV Distribution</TabsTrigger>}
                {visualizations.frequency_monetary_scatter && <TabsTrigger value="frequency_monetary_scatter" className="text-xs">Frequency-Value</TabsTrigger>}
                {visualizations.customer_segmentation && <TabsTrigger value="customer_segmentation" className="text-xs">Segmentation</TabsTrigger>}
                {visualizations.top_customers && <TabsTrigger value="top_customers" className="text-xs">Top Customers</TabsTrigger>}
                {visualizations.probability_alive_distribution && <TabsTrigger value="probability_alive_distribution" className="text-xs">Activity Probability</TabsTrigger>}
                {visualizations.clv_by_segment && <TabsTrigger value="clv_by_segment" className="text-xs">CLV by Segment</TabsTrigger>}
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
            <CardTitle className="text-base">Top 20 Customers by Predicted CLV</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Predicted CLV</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">Frequency</TableHead>
                  <TableHead className="text-right">Avg Order</TableHead>
                  <TableHead className="text-right">Prob Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{c.customer_id}</TableCell>
                    <TableCell className="text-right font-semibold">${c.predicted_clv.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        c.customer_segment === "High Value" ? "default" : 
                        c.customer_segment === "At Risk" ? "destructive" : "secondary"
                      } className="text-xs">
                        {c.customer_segment}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{c.frequency}</TableCell>
                    <TableCell className="text-right">${c.avg_order_value.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{(c.probability_alive * 100).toFixed(0)}%</TableCell>
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
                This report provides probabilistic estimates based on historical customer behavior patterns. 
                CLV forecasts are decision-support tools derived from statistical algorithms and should not be 
                interpreted as guaranteed outcomes. Actual results may vary depending on market conditions, 
                competitive dynamics, and execution quality. The final responsibility for any decisions rests 
                solely with the user.
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
                CSV (Customer CLV)
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



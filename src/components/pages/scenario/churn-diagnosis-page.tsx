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
  ChevronRight, DollarSign, Users, Calendar, BarChart3, Award,
  Target, Clock, Sparkles, AlertTriangle, BookMarked, TrendingDown, UserX, Zap, Percent
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface ChurnResult {
  success: boolean;
  results: {
    customer_predictions: Array<{
      [key: string]: any;
      days_since_activity: number;
      churn_probability: number;
      churn_probability_pct: number;
      risk_tier: string;
      engagement_level: string;
      is_churned: number;
    }>;
    risk_summary: Array<{
      risk_tier: string;
      customer_count: number;
      avg_probability: number;
      avg_probability_pct: number;
      avg_days_inactive: number;
    }>;
    engagement_summary: Array<{
      engagement_level: string;
      customer_count: number;
      avg_churn_prob: number;
      avg_churn_prob_pct: number;
      actual_churn_rate: number;
      actual_churn_rate_pct: number;
    }>;
    metrics: {
      total_customers: number;
      critical_risk_count: number;
      high_risk_count: number;
      at_risk_total: number;
      avg_churn_probability: number;
      avg_days_inactive: number;
      current_churn_count: number;
      current_churn_rate: number;
      model_auc: number;
    };
    model_performance: {
      auc_score: number;
      precision: number;
      recall: number;
      f1_score: number;
      train_size: number;
      test_size: number;
    };
  };
  visualizations: {
    risk_distribution?: string;
    probability_distribution?: string;
    engagement_vs_churn?: string;
    roc_curve?: string;
    tier_metrics?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    total_customers: number;
    at_risk_count: number;
    model_auc: number;
  };
}

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const today = new Date();
  
  for (let i = 1; i <= 500; i++) {
    const daysAgo = Math.floor(Math.random() * 365);
    const lastActivity = new Date(today);
    lastActivity.setDate(lastActivity.getDate() - daysAgo);
    
    data.push({
      customer_id: `CUST_${String(i).padStart(4, '0')}`,
      last_activity_date: lastActivity.toISOString().split('T')[0]
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
    a.download = 'churn_source_data.csv';
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
            <h2 className="text-lg font-semibold">Churn Prediction Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Churn Prediction?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Churn prediction uses machine learning to identify customers likely to stop using your product or service. 
              By analyzing engagement patterns (specifically days since last activity), the model assigns each customer 
              a churn probability score (0-100%), enabling proactive retention efforts before customers are lost.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Model Algorithm
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Random Forest Classifier</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Type:</strong> Ensemble machine learning model<br/>
                  <strong>Trees:</strong> 100 decision trees with max depth 5<br/>
                  <strong>Input:</strong> Days since last activity<br/>
                  <strong>Output:</strong> Churn probability (0-100%)
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Churn Definition</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Threshold:</strong> 90 days of inactivity<br/>
                  <strong>Churned:</strong> Last activity &gt; 90 days ago<br/>
                  <strong>Active:</strong> Last activity ≤ 90 days ago<br/>
                  <strong>Rationale:</strong> Industry standard for engagement-based churn
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Training Process</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Split:</strong> 70% training, 30% testing<br/>
                  <strong>Class Balance:</strong> Weighted to handle imbalanced data<br/>
                  <strong>Validation:</strong> AUC, Precision, Recall, F1 scores<br/>
                  <strong>Prediction:</strong> Probability score for each customer
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Risk Tiers (4 Levels)
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-red-600/30 bg-red-50/10">
                <p className="font-medium text-sm text-red-600">Critical Risk (≥75%)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Extremely high churn probability. Immediate intervention required.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-orange-600/30 bg-orange-50/10">
                <p className="font-medium text-sm text-orange-600">High Risk (50-75%)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  High churn likelihood. Proactive retention campaigns needed.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-yellow-600/30 bg-yellow-50/10">
                <p className="font-medium text-sm text-yellow-600">Medium Risk (25-50%)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Moderate risk. Monitor closely and engage periodically.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary">Low Risk (&lt;25%)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Low churn probability. Maintain standard engagement.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Engagement Levels
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Very Active:</strong> Last activity within 7 days</p>
              <p>• <strong>Active:</strong> Last activity 8-30 days ago</p>
              <p>• <strong>Moderate:</strong> Last activity 31-90 days ago</p>
              <p>• <strong>Low:</strong> Last activity 91-180 days ago</p>
              <p>• <strong>Inactive:</strong> Last activity &gt; 180 days ago</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Retention Strategies by Risk Tier
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Critical & High Risk</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Action:</strong> Urgent intervention → Personal outreach, win-back offers (20-30% discount), 
                  satisfaction surveys, dedicated account manager contact
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Medium Risk</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Action:</strong> Re-engagement campaigns → Product updates, feature highlights, 
                  educational content, limited-time offers (10-15% discount)
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Low Risk</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Action:</strong> Maintain satisfaction → Regular communication, loyalty rewards, 
                  product recommendations, community engagement
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Model Performance Metrics
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>AUC (Area Under ROC):</strong> 0.5 = random guess, 1.0 = perfect prediction</p>
              <p>• <strong>Precision:</strong> % of predicted churners who actually churn</p>
              <p>• <strong>Recall:</strong> % of actual churners correctly identified</p>
              <p>• <strong>F1 Score:</strong> Harmonic mean of precision and recall</p>
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
                  <li>• Recent activity data (last 12 months)</li>
                  <li>• Clean date formats</li>
                  <li>• Both active and churned customers</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Implementation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Score customers weekly</li>
                  <li>• Act on high-risk immediately</li>
                  <li>• Track retention campaign ROI</li>
                  <li>• Retrain model monthly</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> This simplified model uses only last activity date. 
              For production use, consider enriching with additional features: purchase frequency, average order value, 
              support tickets, email engagement, feature usage, and demographic data for improved accuracy.
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
          <UserX className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Churn Prediction</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Predict customer churn risk using machine learning. Identify at-risk customers before they leave, 
          enabling proactive retention strategies and reducing customer attrition through data-driven interventions.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">ML-Based Prediction</p>
              <p className="text-xs text-muted-foreground">Random Forest model</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">4 Risk Tiers</p>
              <p className="text-xs text-muted-foreground">Critical to Low risk</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Retention Strategies</p>
              <p className="text-xs text-muted-foreground">Tier-specific actions</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use Churn Prediction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Customer ID column",
                  "Last activity/login date",
                  "100+ customers recommended",
                  "Mix of active and inactive customers",
                  "Recent data (last 12 months)"
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
                  "Customer-level churn probability (0-100%)",
                  "Risk tier classification (4 levels)",
                  "At-risk customer identification",
                  "Engagement level analysis",
                  "Targeted retention recommendations"
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

export default function ChurnPredictionPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<ChurnResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const [customerIdCol, setCustomerIdCol] = useState<string>("");
  const [lastActivityCol, setLastActivityCol] = useState<string>("");
  const [referenceDate, setReferenceDate] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setCustomerIdCol("customer_id");
    setLastActivityCol("last_activity_date");
    setReferenceDate(new Date().toISOString().split('T')[0]);
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
      setReferenceDate(new Date().toISOString().split('T')[0]);
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
        name: "Last Activity Column",
        passed: !!lastActivityCol,
        message: lastActivityCol 
          ? `Using: ${lastActivityCol}` 
          : "Select last activity date column"
      },
      {
        name: "Reference Date Set",
        passed: !!referenceDate,
        message: referenceDate 
          ? `Reference: ${referenceDate}` 
          : "Set reference date for analysis"
      }
    ];
    
    if (customerIdCol && lastActivityCol) {
      checks.push({
        name: "Sufficient Data",
        passed: data.length >= 20,
        message: data.length >= 100
          ? `${data.length} customers (excellent)`
          : data.length >= 20
          ? `${data.length} customers (acceptable)`
          : `Only ${data.length} customers (need ≥20)`
      });
    }
    
    return checks;
  }, [data, customerIdCol, lastActivityCol, referenceDate]);

  const runPrediction = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        customer_id_col: customerIdCol,
        last_activity_col: lastActivityCol,
        reference_date: referenceDate || undefined
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/churn-prediction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Prediction failed");
      }
      
      const result: ChurnResult = await res.json();
      setResults(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediction failed");
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
        <CardDescription>Select customer and activity columns</CardDescription>
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
            <Label>Last Activity Date *</Label>
            <Select value={lastActivityCol || "__none__"} onValueChange={v => setLastActivityCol(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-- Select --</SelectItem>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Reference Date (optional)</Label>
            <Input
              type="date"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use today's date. This is the date from which inactivity is calculated.
            </p>
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
            <Button onClick={runPrediction} disabled={loading || !canRun} className="gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Predicting...
                </>
              ) : (
                <>
                  Run Prediction
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 4: Summary (LTV 포맷)
  const renderStep4Summary = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights } = results;
    const metrics = r.metrics;
    const tiers = r.risk_summary.sort((a, b) => {
      const order = ['Critical', 'High', 'Medium', 'Low'];
      return order.indexOf(a.risk_tier) - order.indexOf(b.risk_tier);
    });

    const finding = `Analysis of ${summary.total_customers.toLocaleString()} customers reveals ${summary.at_risk_count} at high or critical risk of churn. The model achieved an AUC score of ${metrics.model_auc.toFixed(3)}, ${metrics.model_auc >= 0.75 ? 'indicating strong predictive accuracy' : 'providing moderate prediction quality'}. Average churn probability across all customers is ${metrics.avg_churn_probability.toFixed(1)}%, with ${metrics.critical_risk_count} customers requiring immediate intervention.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Churn Prediction Results
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
              value={summary.at_risk_count}
              label="At Risk (High+Critical)"
              icon={AlertTriangle}
            />
            <MetricCard
              value={`${metrics.avg_churn_probability.toFixed(1)}%`}
              label="Avg Churn Probability"
              icon={Percent}
            />
            <MetricCard
              value={metrics.model_auc.toFixed(3)}
              label="Model AUC Score"
              icon={Target}
            />
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Risk Tier Distribution</h4>
            <div className="grid md:grid-cols-4 gap-3">
              {tiers.map((tier) => {
                const tierColors: { [key: string]: string } = {
                  'Critical': 'border-red-600/30 bg-red-600/5',
                  'High': 'border-orange-600/30 bg-orange-600/5',
                  'Medium': 'border-yellow-600/30 bg-yellow-600/5',
                  'Low': 'border-border bg-muted/10'
                };
                
                return (
                  <div
                    key={tier.risk_tier}
                    className={`rounded-lg p-4 border ${tierColors[tier.risk_tier] || 'border-border bg-muted/10'}`}
                  >
                    <AlertTriangle className="w-5 h-5 text-primary mb-2" />
                    <p className="text-sm font-medium">{tier.risk_tier}</p>
                    <p className="text-2xl font-semibold">{tier.customer_count}</p>
                    <p className="text-xs text-muted-foreground">
                      {tier.avg_probability_pct.toFixed(1)}% avg probability
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tier.avg_days_inactive.toFixed(0)} days inactive
                    </p>
                  </div>
                );
              })}
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
            detail={`This churn prediction analysis uses machine learning to identify at-risk customers based on engagement patterns (days since last activity).

■ Total At-Risk: ${summary.at_risk_count} customers (${((summary.at_risk_count/summary.total_customers)*100).toFixed(1)}%)
This represents the number of customers with ≥50% churn probability requiring immediate or proactive retention efforts. These customers should be prioritized for win-back campaigns to prevent revenue loss.

■ Model AUC: ${metrics.model_auc.toFixed(3)}
${metrics.model_auc >= 0.8 
  ? 'Excellent discrimination ability (AUC ≥ 0.80). The model reliably distinguishes churners from active customers, making predictions highly actionable for retention campaigns.'
  : metrics.model_auc >= 0.7
  ? 'Good discrimination ability (AUC 0.70-0.79). The model effectively identifies at-risk customers, though predictions should be combined with business judgment.'
  : 'Moderate discrimination ability (AUC < 0.70). Consider enriching with additional features (purchase frequency, engagement metrics) for better accuracy.'}

■ Current Churn Rate: ${metrics.current_churn_rate.toFixed(1)}%
Based on the 90-day inactivity threshold, ${metrics.current_churn_count} customers (${metrics.current_churn_rate.toFixed(1)}%) are already classified as churned. This baseline helps assess the magnitude of the churn problem and potential revenue impact.

■ Risk Tier Breakdown
${tiers.map(t => 
  `• ${t.risk_tier}: ${t.customer_count} customers (${t.avg_probability_pct.toFixed(1)}% avg churn probability, ${t.avg_days_inactive.toFixed(0)} days inactive)`
).join('\n')}

${tiers[0]?.customer_count > 0 
  ? `Critical Risk customers (≥75% churn probability) require urgent intervention within 24-48 hours. High Risk customers (50-75%) need proactive win-back campaigns. Medium and Low risk tiers benefit from standard engagement and monitoring.`
  : 'No customers in Critical risk tier - focus retention efforts on High and Medium risk segments to prevent upward migration.'}`}
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

  // Step 5: Methodology (LTV 포맷)
  const renderStep5Methodology = () => {
    if (!results) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-primary" />
            Methodology & Retention Strategies
          </CardTitle>
          <CardDescription>
            Understanding the churn prediction model and recommended actions by risk tier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-medium">Random Forest Model</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Algorithm:</strong> Ensemble of 100 decision trees</p>
                <p>• <strong>Max Depth:</strong> 5 levels (prevents overfitting)</p>
                <p>• <strong>Class Weighting:</strong> Balanced for imbalanced data</p>
                <p>• <strong>Feature:</strong> Days since last activity</p>
                <p>• <strong>Output:</strong> Churn probability (0-100%)</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-medium">Model Performance</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>AUC Score:</strong> {results.results.model_performance.auc_score.toFixed(3)}</p>
                <p>• <strong>Precision:</strong> {results.results.model_performance.precision.toFixed(3)}</p>
                <p>• <strong>Recall:</strong> {results.results.model_performance.recall.toFixed(3)}</p>
                <p>• <strong>F1 Score:</strong> {results.results.model_performance.f1_score.toFixed(3)}</p>
                <p>• <strong>Test Size:</strong> {results.results.model_performance.test_size} customers</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-medium">Churn Definition</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Threshold:</strong> 90 days of inactivity</p>
                <p>• <strong>Churned:</strong> Last activity &gt; 90 days ago</p>
                <p>• <strong>Active:</strong> Last activity ≤ 90 days ago</p>
                <p>• <strong>Rationale:</strong> Industry standard for engagement</p>
                <p>• <strong>Adjustable:</strong> Can be customized per business</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-medium">Risk Tier Classification</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Critical:</strong> ≥75% churn probability</p>
                <p>• <strong>High:</strong> 50-75% churn probability</p>
                <p>• <strong>Medium:</strong> 25-50% churn probability</p>
                <p>• <strong>Low:</strong> &lt;25% churn probability</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-medium mb-3">Retention Strategy Framework</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-red-600/30 bg-red-600/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h4 className="font-medium text-sm">Critical & High Risk (≥50% probability)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Action Required:</strong> Immediate intervention within 24-48 hours
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• <strong>Personal Outreach:</strong> Phone calls from account managers or executives</p>
                  <p>• <strong>Win-Back Offers:</strong> 20-30% discount or 3 months free service</p>
                  <p>• <strong>Satisfaction Survey:</strong> Understand root cause of disengagement</p>
                  <p>• <strong>Executive Escalation:</strong> VP-level involvement for high-value accounts</p>
                  <p>• <strong>Custom Solutions:</strong> Personalized product configuration or support</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-yellow-600/30 bg-yellow-600/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-medium text-sm">Medium Risk (25-50% probability)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Action Required:</strong> Proactive re-engagement campaigns
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• <strong>Email Sequences:</strong> 3-5 email series highlighting value</p>
                  <p>• <strong>Product Updates:</strong> Showcase new features since last activity</p>
                  <p>• <strong>Limited Offers:</strong> 10-15% discount with expiration date</p>
                  <p>• <strong>Educational Content:</strong> Use cases, tips, best practices</p>
                  <p>• <strong>Webinar Invitations:</strong> Interactive sessions on product usage</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <h4 className="font-medium text-sm">Low Risk (&lt;25% probability)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Action Required:</strong> Maintain engagement and satisfaction
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• <strong>Regular Communication:</strong> Monthly newsletters with tips</p>
                  <p>• <strong>Loyalty Programs:</strong> Reward points, referral bonuses</p>
                  <p>• <strong>Upsell Opportunities:</strong> Premium features, add-ons</p>
                  <p>• <strong>Community Building:</strong> User forums, customer success stories</p>
                  <p>• <strong>Milestone Celebrations:</strong> Anniversary emails, usage achievements</p>
                </div>
              </div>
            </div>
          </div>

          <DetailParagraph
            title="Implementation Guidance"
            detail={`This churn prediction model provides customer-level risk scores to prioritize retention efforts efficiently:

1. Immediate Triage (24-48 hours)
   - Export Critical Risk customers (≥75% probability)
   - Assign to account managers for personal outreach
   - Prepare win-back offers and executive escalation paths

2. Proactive Campaigns (Week 1)
   - Design tier-specific email sequences
   - Create offer structure: 30% (Critical), 20% (High), 15% (Medium)
   - Set up satisfaction surveys to understand churn drivers

3. Monitor & Measure (Ongoing)
   - Track retention rate by tier (% of at-risk saved)
   - Measure campaign ROI: (Revenue retained) / (Campaign spend)
   - Monitor tier migration weekly

4. Model Refinement (Monthly)
   - Retrain model with new activity data
   - Add features: purchase frequency, support tickets, email engagement
   - Adjust risk thresholds based on campaign effectiveness

Success Metrics:
• Retention Rate: Target 60%+ for Critical, 70%+ for High risk
• Time to Contact: <24 hours for Critical, <72 hours for High
• Campaign ROI: Minimum 5:1 (revenue saved vs spend)
• Churn Rate Reduction: 15-25% decrease in 90-day churn rate`}
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

  // Step 6: Report (LTV 포맷)
  const renderStep6Report = () => {
    if (!results) return null;

    const { summary, results: r, key_insights, visualizations } = results;
    const tiers = r.risk_summary.sort((a, b) => {
      const order = ['Critical', 'High', 'Medium', 'Low'];
      return order.indexOf(a.risk_tier) - order.indexOf(b.risk_tier);
    });

    const handleDownloadCSV = () => {
      const predictions = r.customer_predictions;
      const headers = ['customer_id', 'days_since_activity', 'churn_probability_pct', 'risk_tier', 'engagement_level'];
      const csv = [
        headers.join(','),
        ...predictions.map(p => [
          p[customerIdCol],
          p.days_since_activity,
          p.churn_probability_pct.toFixed(1),
          p.risk_tier,
          p.engagement_level
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'churn_predictions.csv';
      a.click();
    };

    const handleDownloadPNG = (key: string) => {
      const value = visualizations[key as keyof typeof visualizations];
      if (!value) return;
      
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${value}`;
      link.download = `churn_${key}.png`;
      link.click();
    };

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Customer Churn Prediction Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ML-Based Risk Assessment | {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={summary.total_customers.toLocaleString()} label="Customers" highlight />
              <MetricCard value={summary.at_risk_count} label="At Risk" />
              <MetricCard value={`${r.metrics.avg_churn_probability.toFixed(1)}%`} label="Avg Churn Prob" />
              <MetricCard value={r.metrics.model_auc.toFixed(3)} label="Model AUC" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Churn prediction analysis was performed on {summary.total_customers.toLocaleString()} customers
              using Random Forest machine learning. {summary.at_risk_count} customers are classified as high or critical risk,
              with an average churn probability of {r.metrics.avg_churn_probability.toFixed(1)}% across the customer base.
              The model achieved an AUC score of {r.metrics.model_auc.toFixed(3)}.
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
                {visualizations.risk_distribution && <TabsTrigger value="risk_distribution" className="text-xs">Risk Distribution</TabsTrigger>}
                {visualizations.probability_distribution && <TabsTrigger value="probability_distribution" className="text-xs">Probability</TabsTrigger>}
                {visualizations.engagement_vs_churn && <TabsTrigger value="engagement_vs_churn" className="text-xs">Engagement</TabsTrigger>}
                {visualizations.roc_curve && <TabsTrigger value="roc_curve" className="text-xs">ROC Curve</TabsTrigger>}
                {visualizations.tier_metrics && <TabsTrigger value="tier_metrics" className="text-xs">Tier Metrics</TabsTrigger>}
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
            <CardTitle className="text-base">Risk Tier Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                  <TableHead className="text-right">Avg Churn Prob</TableHead>
                  <TableHead className="text-right">Avg Days Inactive</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => (
                  <TableRow key={tier.risk_tier}>
                    <TableCell className="font-medium">{tier.risk_tier}</TableCell>
                    <TableCell className="text-right">{tier.customer_count}</TableCell>
                    <TableCell className="text-right">{tier.avg_probability_pct.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{tier.avg_days_inactive.toFixed(0)} days</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customer Predictions (Sample)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Risk Tier</TableHead>
                  <TableHead className="text-right">Churn Probability</TableHead>
                  <TableHead className="text-right">Days Inactive</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.customer_predictions.slice(0, 10).map((c, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{c[customerIdCol]}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          c.risk_tier === 'Critical' ? 'destructive' :
                          c.risk_tier === 'High' ? 'default' :
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {c.risk_tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{c.churn_probability_pct.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{c.days_since_activity} days</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {r.customer_predictions.length > 10 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Showing first 10 of {r.customer_predictions.length.toLocaleString()} customers
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2">
                <FileText className="w-4 h-4" />
                CSV (All Predictions)
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
                This report is a decision-making support tool derived from machine learning algorithms. 
                The analysis provides probabilistic risk estimates based on historical engagement data; actual churn 
                may vary depending on data quality and external factors. This information does not guarantee 
                specific outcomes, and the final responsibility for any retention decisions rests solely with the user.
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

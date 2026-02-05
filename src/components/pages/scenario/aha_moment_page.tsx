"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, BookOpen, FileText, Download, Settings, Activity,
  ChevronRight, Zap, TrendingUp, Target, Lightbulb, AlertTriangle, 
  BookMarked, BarChart3, Users, Sparkles, Award
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface AhaMomentResult {
  success: boolean;
  results: {
    metrics: {
      total_customers: number;
      retained_customers: number;
      churned_customers: number;
      retention_rate: number;
      aha_moment_feature: string;
      aha_moment_importance: number;
      aha_moment_lift: number;
      impact_level: string;
      model_accuracy: number;
      model_auc: number;
    };
    model_performance: {
      train_accuracy: number;
      test_accuracy: number;
      precision: number;
      recall: number;
      f1_score: number;
      auc: number;
      train_size: number;
      test_size: number;
    };
    feature_importance: Array<{
      feature: string;
      importance: number;
    }>;
    feature_usage: {
      [key: string]: {
        usage_count: number;
        usage_rate: number;
        retention_with: number;
        retention_without: number;
        lift: number;
      };
    };
    combination_analysis: Array<{
      features: string;
      user_count: number;
      retention_rate: number;
      lift_vs_baseline: number;
    }>;
    customer_analysis: Array<{
      [key: string]: any;
      features_used: string[];
      feature_count: number;
      used_aha_moment: number;
      is_retained: number;
    }>;
  };
  visualizations: {
    feature_importance?: string;
    retention_lift?: string;
    retention_comparison?: string;
    usage_distribution?: string;
    model_performance?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    total_customers: number;
    retention_rate: number;
    aha_moment_feature: string;
    aha_moment_lift: number;
  };
}

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  
  for (let i = 1; i <= 200; i++) {
    const customerType = Math.random();
    
    // Feature usage probabilities based on customer type
    let featureA, featureB, featureC, featureD, featureE, isRetained;
    
    if (customerType < 0.30) {
      // Power users (30%): high feature adoption, high retention
      featureA = Math.random() < 0.90 ? 1 : 0;
      featureB = Math.random() < 0.85 ? 1 : 0;
      featureC = Math.random() < 0.70 ? 1 : 0;
      featureD = Math.random() < 0.60 ? 1 : 0;
      featureE = Math.random() < 0.50 ? 1 : 0;
      isRetained = Math.random() < 0.85 ? 1 : 0;  // 85% retention
    } else if (customerType < 0.60) {
      // Moderate users (30%): some features, decent retention
      featureA = Math.random() < 0.50 ? 1 : 0;
      featureB = Math.random() < 0.40 ? 1 : 0;
      featureC = Math.random() < 0.30 ? 1 : 0;
      featureD = Math.random() < 0.20 ? 1 : 0;
      featureE = Math.random() < 0.10 ? 1 : 0;
      isRetained = Math.random() < 0.55 ? 1 : 0;  // 55% retention
    } else {
      // Low engagement (40%): minimal features, low retention
      featureA = Math.random() < 0.20 ? 1 : 0;
      featureB = Math.random() < 0.15 ? 1 : 0;
      featureC = Math.random() < 0.10 ? 1 : 0;
      featureD = Math.random() < 0.05 ? 1 : 0;
      featureE = Math.random() < 0.05 ? 1 : 0;
      isRetained = Math.random() < 0.25 ? 1 : 0;  // 25% retention
    }
    
    data.push({
      customer_id: `CUST_${String(i).padStart(4, '0')}`,
      used_feature_A: featureA,
      used_feature_B: featureB,
      used_feature_C: featureC,
      used_feature_D: featureD,
      used_feature_E: featureE,
      is_retained: isRetained
    });
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
        return val;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aha_moment_data.csv';
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
            <h2 className="text-lg font-semibold">Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Aha-Moment Discovery?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Aha-Moment Discovery identifies the critical user actions that convert new customers into loyal, retained users. 
              By analyzing feature adoption patterns and retention outcomes, it reveals which behaviors have the strongest 
              correlation with long-term engagement—the "aha moment" where users realize product value.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analysis Method
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Random Forest Classifier</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Algorithm:</strong> Ensemble machine learning model with 100 decision trees<br/>
                  <strong>Purpose:</strong> Rank features by importance for retention prediction<br/>
                  <strong>Input:</strong> Binary feature usage (0/1) + retention status<br/>
                  <strong>Output:</strong> Feature importance scores (0-1)
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Retention Lift Calculation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Formula:</strong> Lift = (Retention_With - Retention_Without) / Retention_Without × 100%<br/>
                  <strong>Example:</strong> If users with Feature A have 80% retention vs 50% without<br/>
                  <strong>Lift:</strong> (80 - 50) / 50 × 100 = 60% improvement
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Impact Classification</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Critical:</strong> ≥50% retention lift (transformative impact)<br/>
                  <strong>High:</strong> 25-50% lift (significant impact)<br/>
                  <strong>Moderate:</strong> 10-25% lift (meaningful impact)<br/>
                  <strong>Low:</strong> &lt;10% lift (minimal impact)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Key Metrics
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Feature Importance:</strong> ML-derived score indicating retention prediction power</p>
              <p>• <strong>Retention Lift:</strong> % improvement in retention when feature is used</p>
              <p>• <strong>Usage Rate:</strong> % of customers who adopted the feature</p>
              <p>• <strong>Model AUC:</strong> Accuracy of retention prediction (0.5-1.0, higher = better)</p>
              <p>• <strong>Combination Analysis:</strong> Retention impact of using multiple features together</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Product Strategy Applications
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Onboarding Optimization</p>
                <p className="text-xs text-muted-foreground">
                  Guide new users to Aha-Moment features first. Design onboarding flows 
                  that drive adoption of high-impact actions within first session.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Feature Prioritization</p>
                <p className="text-xs text-muted-foreground">
                  Invest engineering resources in improving and promoting features 
                  with proven retention impact. Deprioritize low-impact features.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Activation Metrics</p>
                <p className="text-xs text-muted-foreground">
                  Define "activated user" as someone who completed the Aha-Moment action. 
                  Track activation rate as key growth metric.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Marketing Messaging</p>
                <p className="text-xs text-muted-foreground">
                  Highlight Aha-Moment features in product positioning and ads. 
                  Show prospective users the value they'll experience.
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
                  <li>• 100+ customers minimum (200+ preferred)</li>
                  <li>• Mix of retained and churned users</li>
                  <li>• 3-10 feature columns (binary 0/1)</li>
                  <li>• Clear retention definition (30+ days active)</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Implementation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Re-analyze quarterly as product evolves</li>
                  <li>• A/B test onboarding changes</li>
                  <li>• Track Aha-Moment adoption rate</li>
                  <li>• Measure impact on retention cohorts</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> Correlation does not equal causation. 
              While Aha-Moment analysis reveals strong associations between actions and retention, 
              validate findings with controlled experiments (A/B tests) before major product changes.
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
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Aha-Moment Discovery</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Identify the critical user actions that drive retention and loyalty. Discover which features 
          create the "aha moment" where customers realize product value, enabling data-driven onboarding 
          optimization and feature prioritization.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">ML-Powered Analysis</p>
              <p className="text-xs text-muted-foreground">Random Forest ranking</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Retention Lift</p>
              <p className="text-xs text-muted-foreground">Impact measurement</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Action Insights</p>
              <p className="text-xs text-muted-foreground">Product strategies</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use Aha-Moment Discovery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Customer ID column",
                  "Feature usage columns (binary 0/1)",
                  "Retention status column (1=retained, 0=churned)",
                  "100+ customers (200+ recommended)",
                  "Mix of retained and churned users"
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
                  "Aha-Moment feature identification",
                  "Retention lift by feature (%)",
                  "Feature importance rankings",
                  "Combination effect analysis",
                  "Onboarding optimization roadmap"
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
export default function AhaMomentPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<AhaMomentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const [customerIdCol, setCustomerIdCol] = useState<string>("");
  const [featureCols, setFeatureCols] = useState<string[]>([]);
  const [retentionCol, setRetentionCol] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    setCustomerIdCol("customer_id");
    setFeatureCols(["used_feature_A", "used_feature_B", "used_feature_C", "used_feature_D", "used_feature_E"]);
    setRetentionCol("is_retained");
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

  const handleToggleFeature = useCallback((feature: string) => {
    setFeatureCols(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
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
        name: "Feature Columns",
        passed: featureCols.length >= 3,
        message: featureCols.length >= 3
          ? `${featureCols.length} features selected`
          : featureCols.length > 0
          ? `Only ${featureCols.length} features (need ≥3)`
          : "Select at least 3 feature columns"
      },
      {
        name: "Retention Column",
        passed: !!retentionCol,
        message: retentionCol 
          ? `Using: ${retentionCol}` 
          : "Select retention status column"
      }
    ];
    
    if (customerIdCol && featureCols.length >= 3 && retentionCol) {
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
  }, [data, customerIdCol, featureCols, retentionCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        customer_id_col: customerIdCol,
        feature_cols: featureCols,
        is_retained_col: retentionCol
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/aha-moment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: AhaMomentResult = await res.json();
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
        <CardDescription>Select customer ID, feature usage columns, and retention status</CardDescription>
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
            <Label>Retention Status (1=retained, 0=churned) *</Label>
            <Select value={retentionCol || "__none__"} onValueChange={v => setRetentionCol(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-- Select --</SelectItem>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Feature Usage Columns (select 3-10) *</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-3 border border-border rounded-lg">
            {columns.filter(col => col !== customerIdCol && col !== retentionCol).map((col) => (
              <label key={col} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={featureCols.includes(col)}
                  onChange={() => handleToggleFeature(col)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{col}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {featureCols.length} features selected. Binary columns (0/1) indicating feature usage.
          </p>
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
    const metrics = r.metrics;

    const finding = `Analysis of ${summary.total_customers.toLocaleString()} customers reveals "${metrics.aha_moment_feature}" as the Aha-Moment, delivering ${metrics.aha_moment_lift.toFixed(1)}% higher retention. This ${metrics.impact_level.toLowerCase()} impact action is the critical driver for converting new users to loyal customers.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Aha-Moment Discovery Results
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
              value={`${metrics.retention_rate.toFixed(1)}%`}
              label="Baseline Retention"
              icon={TrendingUp}
            />
            <MetricCard
              value={`${metrics.aha_moment_lift.toFixed(0)}%`}
              label="Aha-Moment Lift"
              icon={Zap}
            />
            <MetricCard
              value={metrics.model_auc.toFixed(3)}
              label="Model AUC"
              icon={Target}
            />
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-primary" />
              <p className="font-semibold">Aha-Moment: {metrics.aha_moment_feature}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Impact Level</p>
                <Badge variant={
                  metrics.impact_level === 'Critical' ? 'destructive' :
                  metrics.impact_level === 'High' ? 'default' :
                  'secondary'
                } className="text-xs">
                  {metrics.impact_level}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Retention Lift</p>
                <p className="font-semibold text-primary">{metrics.aha_moment_lift.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Feature Importance</p>
                <p className="font-semibold">{metrics.aha_moment_importance.toFixed(3)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Top 5 Features by Importance</h4>
            <div className="space-y-2">
              {r.feature_importance.slice(0, 5).map((feat, idx) => {
                const usage = r.feature_usage[feat.feature];
                return (
                  <div key={idx} className="p-3 rounded-lg border border-border bg-muted/10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{feat.feature}</p>
                      <Badge variant="secondary" className="text-xs">
                        Importance: {feat.importance.toFixed(3)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <p>Usage Rate</p>
                        <p className="font-semibold text-foreground">{usage.usage_rate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p>Retention Lift</p>
                        <p className="font-semibold text-foreground">{usage.lift.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p>With Feature</p>
                        <p className="font-semibold text-foreground">{usage.retention_with.toFixed(1)}%</p>
                      </div>
                    </div>
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
            detail={`This Aha-Moment analysis identifies critical user actions that drive long-term retention using Random Forest machine learning.

■ Aha-Moment Feature: ${metrics.aha_moment_feature}
${metrics.aha_moment_lift >= 50 
  ? `Critical impact with ${metrics.aha_moment_lift.toFixed(1)}% retention lift. Users who engage with this feature are dramatically more likely to become loyal customers. This should be the #1 priority in onboarding flows.`
  : metrics.aha_moment_lift >= 25
  ? `High impact with ${metrics.aha_moment_lift.toFixed(1)}% retention lift. This feature significantly increases retention and should be prominently featured in product onboarding and messaging.`
  : metrics.aha_moment_lift >= 10
  ? `Moderate impact with ${metrics.aha_moment_lift.toFixed(1)}% retention lift. While meaningful, consider combining with other high-impact features for maximum effect.`
  : `Low impact with ${metrics.aha_moment_lift.toFixed(1)}% retention lift. This feature shows correlation but may not be the primary driver. Investigate context and user segments.`}

■ Feature Importance: ${metrics.aha_moment_importance.toFixed(3)}
Machine learning model ranked this feature highest among ${r.feature_importance.length} analyzed features. Importance scores indicate predictive power for retention—higher scores mean stronger association with user loyalty.

■ Baseline vs Aha-Moment Retention
• Baseline (all users): ${metrics.retention_rate.toFixed(1)}% retention
• Users with ${metrics.aha_moment_feature}: ${r.feature_usage[metrics.aha_moment_feature].retention_with.toFixed(1)}% retention
• Users without: ${r.feature_usage[metrics.aha_moment_feature].retention_without.toFixed(1)}% retention
${(r.feature_usage[metrics.aha_moment_feature].retention_with - r.feature_usage[metrics.aha_moment_feature].retention_without) > 30 
  ? 'The dramatic difference demonstrates this is a true value realization moment.'
  : 'The meaningful gap suggests this action helps users discover product value.'}

■ Model Performance: AUC ${metrics.model_auc.toFixed(3)}
${metrics.model_auc >= 0.8
  ? `Excellent predictive accuracy (AUC ≥ 0.80). The model reliably identifies retention drivers, making feature rankings highly actionable.`
  : metrics.model_auc >= 0.7
  ? `Good predictive accuracy (AUC 0.70-0.79). Feature importance rankings are reliable but should be validated with A/B tests.`
  : `Moderate accuracy (AUC < 0.70). Consider collecting additional behavioral data or defining retention more precisely to improve model performance.`}

${r.combination_analysis.length > 0 && r.combination_analysis[0].retention_rate > metrics.retention_rate + 10
  ? `\n■ Feature Combinations\nBest combo: ${r.combination_analysis[0].features} achieves ${r.combination_analysis[0].retention_rate.toFixed(1)}% retention (+${r.combination_analysis[0].lift_vs_baseline.toFixed(1)}pp vs baseline). Multiple Aha-Moments compound retention impact.`
  : ''}`}
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
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-primary" />
            Methodology & Strategic Framework
          </CardTitle>
          <CardDescription>
            Understanding Random Forest analysis and product optimization strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-medium">Random Forest Algorithm</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Model:</strong> Ensemble of 100 decision trees</p>
                <p>• <strong>Input:</strong> Binary feature usage (0/1)</p>
                <p>• <strong>Output:</strong> Feature importance scores</p>
                <p>• <strong>Balanced:</strong> Class weights for retention/churn</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-medium">Model Performance</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>AUC:</strong> {results.results.model_performance.auc.toFixed(3)}</p>
                <p>• <strong>Accuracy:</strong> {(results.results.model_performance.test_accuracy * 100).toFixed(1)}%</p>
                <p>• <strong>Precision:</strong> {(results.results.model_performance.precision * 100).toFixed(1)}%</p>
                <p>• <strong>Recall:</strong> {(results.results.model_performance.recall * 100).toFixed(1)}%</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-medium">Retention Lift Calculation</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>With Feature:</strong> Retention rate of users who used it</p>
                <p>• <strong>Without:</strong> Retention rate of non-users</p>
                <p>• <strong>Formula:</strong> (With - Without) / Without × 100%</p>
                <p>• <strong>Impact:</strong> Higher = stronger retention driver</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-medium">Impact Classification</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Critical:</strong> ≥50% lift (transformative)</p>
                <p>• <strong>High:</strong> 25-50% lift (significant)</p>
                <p>• <strong>Moderate:</strong> 10-25% lift (meaningful)</p>
                <p>• <strong>Low:</strong> &lt;10% lift (minimal)</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-medium mb-3">Strategic Framework by Impact Level</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-red-600/30 bg-red-600/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h4 className="font-medium text-sm">Critical Impact (≥50% Lift)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Priority:</strong> Maximum focus - this is your true Aha-Moment
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• <strong>Onboarding:</strong> Design entire flow to drive this action in first session</p>
                  <p>• <strong>Activation Metric:</strong> Define as "user completed Aha-Moment"</p>
                  <p>• <strong>Engineering:</strong> Ensure feature is flawless, fast, intuitive</p>
                  <p>• <strong>Marketing:</strong> Lead all messaging with this value proposition</p>
                  <p>• <strong>Target:</strong> 70%+ of users complete within 7 days</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-orange-600/30 bg-orange-600/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <h4 className="font-medium text-sm">High Impact (25-50% Lift)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Priority:</strong> Secondary driver - significant retention value
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• <strong>Onboarding:</strong> Include in Step 2-3 after primary Aha-Moment</p>
                  <p>• <strong>Prompts:</strong> In-app tooltips and nudges to drive adoption</p>
                  <p>• <strong>Product:</strong> Invest in improvements and polish</p>
                  <p>• <strong>Content:</strong> Create tutorials, guides, best practices</p>
                  <p>• <strong>Target:</strong> 50%+ adoption within 14 days</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-5 h-5 text-primary" />
                  <h4 className="font-medium text-sm">Moderate Impact (10-25% Lift)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Priority:</strong> Supporting feature - meaningful but not critical
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• <strong>Onboarding:</strong> Optional exploration, not required flow</p>
                  <p>• <strong>Discovery:</strong> Feature tours, release notes, changelog</p>
                  <p>• <strong>Maintenance:</strong> Keep functional but deprioritize major work</p>
                  <p>• <strong>Combinations:</strong> May compound with high-impact features</p>
                  <p>• <strong>Target:</strong> Natural discovery, no forced adoption</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <h4 className="font-medium text-sm">Low Impact (&lt;10% Lift)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Priority:</strong> Minimal focus - reassess strategic fit
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• <strong>Analysis:</strong> Investigate why correlation is weak</p>
                  <p>• <strong>Segment:</strong> May be valuable for specific user types</p>
                  <p>• <strong>Sunset:</strong> Consider deprecation if maintenance burden high</p>
                  <p>• <strong>Resources:</strong> Reallocate engineering to high-impact features</p>
                  <p>• <strong>Decision:</strong> Keep if low-cost, remove if complex</p>
                </div>
              </div>
            </div>
          </div>

          <DetailParagraph
            title="Implementation Roadmap"
            detail={`Systematic approach to optimizing product for Aha-Moment discovery:

Week 1: Immediate Actions
• Analyze top 3 features by importance
• Map current onboarding flow against Aha-Moment
• Identify friction points preventing feature adoption
• Create baseline metrics: activation rate, time-to-activation

Week 2-4: Onboarding Redesign
• Design new user flow prioritizing Aha-Moment feature
• Remove unnecessary steps before critical action
• Add contextual prompts and guidance
• A/B test: New onboarding vs Control

Month 2: Refinement & Scale
• Analyze A/B test results (target: 20%+ lift in activation)
• Iterate on winning variant
• Extend to mobile/web platforms
• Create in-product education content

Month 3: Measurement & Validation
• Track cohort retention by activation status
• Measure: Activated users vs Non-activated retention delta
• Validate that Aha-Moment correlation holds in causal test
• Document learnings for future product development

Ongoing: Continuous Optimization
• Re-run Aha-Moment analysis quarterly (features evolve)
• Track feature adoption trends
• A/B test variations of onboarding prompts
• Expand analysis to user segments (B2B, B2C, etc.)

Success Metrics:
• Activation Rate: 70%+ complete Aha-Moment in first 7 days
• Time-to-Activation: Median 1-3 days from signup
• Retention Lift: 30%+ higher for activated vs non-activated users
• Model Confidence: AUC ≥ 0.75 for reliable rankings`}
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

  // Step 6: Report
  const renderStep6Report = () => {
    if (!results) return null;

    const { summary, results: r, key_insights, visualizations } = results;

    const handleDownloadCSV = () => {
      const customers = r.customer_analysis;
      const headers = ['customer_id', 'features_used', 'feature_count', 'used_aha_moment', 'is_retained'];
      const csv = [
        headers.join(','),
        ...customers.map(c => [
          c[customerIdCol],
          `"${c.features_used.join(';')}"`,
          c.feature_count,
          c.used_aha_moment,
          c.is_retained
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'aha_moment_analysis.csv';
      a.click();
    };

    const handleDownloadPNG = (key: string) => {
      const value = visualizations[key as keyof typeof visualizations];
      if (!value) return;
      
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${value}`;
      link.download = `aha_moment_${key}.png`;
      link.click();
    };

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Aha-Moment Discovery Report</h1>
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
              <MetricCard value={`${r.metrics.retention_rate.toFixed(1)}%`} label="Retention" />
              <MetricCard value={`${r.metrics.aha_moment_lift.toFixed(0)}%`} label="Aha Lift" />
              <MetricCard value={r.metrics.model_auc.toFixed(3)} label="Model AUC" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Aha-Moment Discovery analysis identified "{r.metrics.aha_moment_feature}" as the critical retention driver 
              with {r.metrics.aha_moment_lift.toFixed(1)}% lift ({r.metrics.impact_level} impact). 
              Random Forest analysis of {summary.total_customers.toLocaleString()} customers across {r.feature_importance.length} features 
              achieved {(r.model_performance.auc * 100).toFixed(1)}% prediction accuracy (AUC).
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
                {visualizations.feature_importance && <TabsTrigger value="feature_importance" className="text-xs">Importance</TabsTrigger>}
                {visualizations.retention_lift && <TabsTrigger value="retention_lift" className="text-xs">Lift</TabsTrigger>}
                {visualizations.retention_comparison && <TabsTrigger value="retention_comparison" className="text-xs">Comparison</TabsTrigger>}
                {visualizations.usage_distribution && <TabsTrigger value="usage_distribution" className="text-xs">Usage</TabsTrigger>}
                {visualizations.model_performance && <TabsTrigger value="model_performance" className="text-xs">Model</TabsTrigger>}
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
            <CardTitle className="text-base">Feature Importance Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-right">Importance</TableHead>
                  <TableHead className="text-right">Usage Rate</TableHead>
                  <TableHead className="text-right">Retention Lift</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.feature_importance.slice(0, 10).map((feat, idx) => {
                  const usage = r.feature_usage[feat.feature];
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {feat.feature}
                        {idx === 0 && <Badge variant="default" className="ml-2 text-xs">Aha-Moment</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{feat.importance.toFixed(3)}</TableCell>
                      <TableCell className="text-right">{usage.usage_rate.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{usage.lift.toFixed(1)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {r.combination_analysis.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Feature Combination Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature Combination</TableHead>
                    <TableHead className="text-right">User Count</TableHead>
                    <TableHead className="text-right">Retention Rate</TableHead>
                    <TableHead className="text-right">Lift vs Baseline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.combination_analysis.slice(0, 5).map((combo, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{combo.features}</TableCell>
                      <TableCell className="text-right">{combo.user_count}</TableCell>
                      <TableCell className="text-right">{combo.retention_rate.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{combo.lift_vs_baseline > 0 ? '+' : ''}{combo.lift_vs_baseline.toFixed(1)}pp</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Model Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Classification Metrics</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accuracy (Test)</span>
                    <span className="font-medium">{(r.model_performance.test_accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Precision</span>
                    <span className="font-medium">{(r.model_performance.precision * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recall</span>
                    <span className="font-medium">{(r.model_performance.recall * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">F1 Score</span>
                    <span className="font-medium">{(r.model_performance.f1_score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AUC-ROC</span>
                    <span className="font-medium">{r.model_performance.auc.toFixed(3)}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Data Split</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Training Set</span>
                    <span className="font-medium">{r.model_performance.train_size} customers</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Test Set</span>
                    <span className="font-medium">{r.model_performance.test_size} customers</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Split Ratio</span>
                    <span className="font-medium">70% / 30%</span>
                  </div>
                </div>
              </div>
            </div>
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
                CSV (All Analysis)
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
                This analysis identifies correlations between feature usage and retention using machine learning. 
                Correlation does not imply causation—validate findings with controlled A/B tests before making major product changes. 
                Model predictions are based on historical data and may not generalize to future users or different contexts. 
                Final responsibility for product decisions rests with the user.
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
            Analysis Guide
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

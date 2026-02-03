
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
  ChevronRight, DollarSign, Package, BarChart3, TrendingDown,
  Target, Percent, Sparkles, AlertTriangle, BookMarked, ArrowUpCircle,
  ArrowDownCircle, MinusCircle, Tag, Zap
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface LeadScoringResult {
  success: boolean;
  results: {
    elasticity_by_product: Array<{
      lead_id: string;
      elasticity: number;
      r_squared: number;
      demand_type: string;
      interpretation: string;
      avg_source: number;
      avg_converted: number;
      total_revenue: number;
      avg_revenue: number;
      min_source: number;
      max_source: number;
      source_range: number;
      observations: number;
    }>;
    optimization_results: Array<{
      lead_id: string;
      current_source: number;
      optimal_source: number;
      source_change: number;
      source_change_pct: number;
      current_converted: number;
      optimal_converted: number;
      current_revenue: number;
      optimal_revenue: number;
      revenue_change: number;
      revenue_change_pct: number;
      recommendation: string;
      action: string;
      elasticity: number;
    }>;
    metrics: {
      total_products: number;
      elastic_products: number;
      inelastic_products: number;
      avg_elasticity: number;
      median_elasticity: number;
      total_revenue: number;
      avg_revenue_per_product: number;
      avg_r_squared: number;
    };
  };
  visualizations: {
    elasticity_distribution?: string;
    source_converted_scatter?: string;
    revenue_by_product?: string;
    demand_type_distribution?: string;
    optimization_comparison?: string;
    source_recommendations?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    total_products: number;
    avg_elasticity: number;
    total_revenue: number;
  };
}

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const products = Array.from({ length: 50 }, (_, i) => `PROD_${String(i + 1).padStart(3, '0')}`);
  
  products.forEach(lead_id => {
    const baseSource = 10 + Math.random() * 90;
    const baseConverted = 50 + Math.random() * 450;
    const elasticity = -2.0 + Math.random() * 1.7;
    
    const numObservations = 20 + Math.floor(Math.random() * 21);
    
    for (let i = 0; i < numObservations; i++) {
      const source = baseSource * (0.7 + Math.random() * 0.6);
      const sourceRatio = source / baseSource;
      const convertedRatio = Math.pow(sourceRatio, elasticity);
      const converted = Math.floor(baseConverted * convertedRatio * (0.8 + Math.random() * 0.4));
      
      data.push({
        lead_id,
        source: parseFloat(source.toFixed(2)),
        converted: Math.max(1, converted)
      });
    }
  });
  
  return data;
};

const MetricCard: React.FC<{ 
  value: string | number; 
  label: string; 
  icon?: React.FC<{ className?: string }>; 
  highlight?: boolean;
  negative?: boolean;
}> = ({ value, label, icon: Icon, highlight, negative }) => (
  <div className={`text-center p-4 rounded-lg border ${
    negative ? 'border-destructive/30 bg-destructive/5' : 
    highlight ? 'border-primary/30 bg-primary/5' : 
    'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className="w-5 h-5 mx-auto mb-2 text-primary" />}
    <p className={`text-2xl font-semibold ${
      negative ? 'text-destructive' : highlight ? 'text-primary' : ''
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
    a.download = 'elasticity_source_data.csv';
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
            <h2 className="text-lg font-semibold">Lead Scoring Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Source Elasticity of Demand?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Source elasticity measures how sensitive demand is to source changes. It quantifies the percentage change 
              in converted demanded for a 1% change in source. This analysis helps determine optimal pricing strategies 
              to maximize revenue.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Calculation Method
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Log-Linear Regression</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Formula:</strong> log(Converted) = a + E × log(Source)<br/>
                  <strong>Where:</strong> E = Source Conversion probability<br/>
                  <strong>Method:</strong> Linear regression on log-transformed data<br/>
                  <strong>Output:</strong> Elasticity value and R² (model quality)
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Interpretation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>E = -1.5:</strong> 1% source increase → 1.5% converted decrease<br/>
                  <strong>E = -0.5:</strong> 1% source increase → 0.5% converted decrease<br/>
                  <strong>Negative values:</strong> Normal goods (source ↑ → demand ↓)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Demand Classification
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Elastic Demand (|E| {'>'} 1)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Demand is highly sensitive to source. Source reductions increase total revenue. 
                  Strategy: Competitive pricing, promotions, volume discounts.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Inelastic Demand (|E| {'<'} 1)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Demand is less sensitive to source. Source increases can increase total revenue. 
                  Strategy: Premium pricing, value-based pricing, margin focus.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Unit Elastic (|E| = 1)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenue remains constant regardless of source changes. Focus on non-source factors.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Source Optimization
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Objective:</strong> Find source that maximizes Revenue = Source × Converted</p>
              <p><strong>Method:</strong> Revenue function R(P) = P × Q₀ × (P/P₀)^E</p>
              <p><strong>Search Range:</strong> ±30% of current source</p>
              <p><strong>Algorithm:</strong> Scipy bounded optimization (minimize_scalar)</p>
              <p><strong>Output:</strong> Optimal source, expected revenue change, recommendation</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Model Assumptions & Limitations
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Constant Elasticity:</strong> Assumes elasticity doesn't change across source range</p>
              <p>• <strong>Ceteris Paribus:</strong> Other factors (competition, seasonality) held constant</p>
              <p>• <strong>Historical Patterns:</strong> Assumes past source-demand relationships continue</p>
              <p>• <strong>No Network Effects:</strong> Doesn't model viral/word-of-mouth impacts</p>
              <p>• <strong>Requires Source Variation:</strong> Need historical data with different sources</p>
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
                  <li>• 20+ observations per product</li>
                  <li>• Source variation in history</li>
                  <li>• Clean data (no outliers)</li>
                  <li>• Consistent time period</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Implementation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Start with small changes (5-10%)</li>
                  <li>• A/B test recommendations</li>
                  <li>• Monitor competitor response</li>
                  <li>• Re-analyze quarterly</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Strategy Selection</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Elastic: Focus on volume</li>
                  <li>• Inelastic: Focus on margin</li>
                  <li>• Consider brand positioning</li>
                  <li>• Balance short vs long-term</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Validation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Check R² score ({'>'} 0.4)</li>
                  <li>• Verify negative elasticity</li>
                  <li>• Compare with industry norms</li>
                  <li>• Test on holdout data</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> Elasticity estimates are based on 
              historical source-demand relationships. Accuracy depends on data quality, source variation, and market 
              stability. Always validate recommendations with A/B testing before full implementation. Regular 
              re-analysis is essential as market conditions evolve.
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
          <Percent className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Lead Scoring & Source Optimization</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Analyze source elasticity of demand and optimize pricing strategies to maximize revenue. 
          Calculate how demand changes with source variations, classify products as elastic or inelastic, 
          and receive data-driven pricing recommendations.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Elasticity Calculation</p>
              <p className="text-xs text-muted-foreground">Log-linear regression</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Source Optimization</p>
              <p className="text-xs text-muted-foreground">Revenue maximization</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Revenue Forecasting</p>
              <p className="text-xs text-muted-foreground">Impact predictions</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use Elasticity Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Lead ID column",
                  "Source column (historical pricing data)",
                  "Converted sold column",
                  "At least 20 observations per product",
                  "Source variation in historical data"
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
                  "Source elasticity for each product",
                  "Elastic vs Inelastic classification",
                  "Optimal revenue-maximizing sources",
                  "Source change recommendations",
                  "Expected revenue impact projections"
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

export default function LeadScoringPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<LeadScoringResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const [leadIdCol, setLeadIdCol] = useState<string>("");
  const [sourceCol, setSourceCol] = useState<string>("");
  const [convertedCol, setConvertedCol] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setLeadIdCol("lead_id");
    setSourceCol("source");
    setConvertedCol("converted");
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
    const uniqueProducts = new Set(data.map(d => d[leadIdCol])).size;
    
    // Count observations per product
    const productCounts: { [key: string]: number } = {};
    data.forEach(row => {
      const pid = String(row[leadIdCol]);
      productCounts[pid] = (productCounts[pid] || 0) + 1;
    });
    const minObservations = Math.min(...Object.values(productCounts));
    const avgObservations = Object.values(productCounts).reduce((a, b) => a + b, 0) / Object.keys(productCounts).length;
    
    // Check source variation
    let hasSourceVariation = false;
    if (sourceCol) {
      for (const pid of Object.keys(productCounts)) {
        const productSources = data.filter(d => d[leadIdCol] === pid).map(d => Number(d[sourceCol]));
        const uniqueSources = new Set(productSources).size;
        if (uniqueSources >= 3) {
          hasSourceVariation = true;
          break;
        }
      }
    }
    
    const checks: ValidationCheck[] = [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 
          ? `${data.length.toLocaleString()} observations loaded` 
          : "No data loaded"
      },
      {
        name: "Product Column",
        passed: !!leadIdCol,
        message: leadIdCol 
          ? `${uniqueProducts.toLocaleString()} unique products` 
          : "Select product column"
      },
      {
        name: "Source Column",
        passed: !!sourceCol,
        message: sourceCol 
          ? `Using: ${sourceCol}` 
          : "Select source column"
      },
      {
        name: "Converted Column",
        passed: !!convertedCol,
        message: convertedCol 
          ? `Using: ${convertedCol}` 
          : "Select converted column"
      },
      {
        name: "Sufficient Products",
        passed: uniqueProducts >= 5,
        message: uniqueProducts >= 10
          ? `${uniqueProducts} products (excellent)`
          : uniqueProducts >= 5
          ? `${uniqueProducts} products (acceptable)`
          : `Only ${uniqueProducts} products (need ≥5)`
      },
      {
        name: "Observations per Product",
        passed: minObservations >= 10,
        message: minObservations >= 20
          ? `${avgObservations.toFixed(0)} avg observations (excellent)`
          : minObservations >= 10
          ? `${avgObservations.toFixed(0)} avg observations (acceptable)`
          : `Only ${minObservations} min observations (need ≥10 per product)`
      },
      {
        name: "Source Variation",
        passed: hasSourceVariation,
        message: hasSourceVariation
          ? "Source variation detected across products"
          : "Need different source points for same product"
      }
    ];
    
    return checks;
  }, [data, leadIdCol, sourceCol, convertedCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        lead_id_col: leadIdCol,    
        source_col: sourceCol,
        converted_col: convertedCol
        // optimize 제거
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/lead-scoring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: LeadScoringResult = await res.json();
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
    const elasticities = results.results.elasticity_by_product;
    if (!elasticities.length) return;
    
    const headers = Object.keys(elasticities[0]).join(",");
    const rows = elasticities.map(e => Object.values(e).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "elasticity_results.csv";
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${base64}`;
    a.download = `elasticity_${chartKey}.png`;
    a.click();
  };

  // Step 2: Configuration
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Elasticity Analysis
        </CardTitle>
        <CardDescription>Set up lead scoring and source optimization parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Required Columns
          </h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Lead ID *</Label>
              <Select value={leadIdCol || "__none__"} onValueChange={v => setLeadIdCol(v === "__none__" ? "" : v)}>
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
              <Label>Source *</Label>
              <Select value={sourceCol || "__none__"} onValueChange={v => setSourceCol(v === "__none__" ? "" : v)}>
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
              <Label>Converted Sold *</Label>
              <Select value={convertedCol || "__none__"} onValueChange={v => setConvertedCol(v === "__none__" ? "" : v)}>
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
                  Product: {leadIdCol} • Source: {sourceCol} • Converted: {convertedCol}
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
                  Run Elasticity Analysis
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
    const optimizations = r.optimization_results;
    
    const totalGain = optimizations.reduce((sum, opt) => sum + opt.revenue_change, 0);
    const increaseCount = optimizations.filter(o => o.action === 'Source increase').length;
    const decreaseCount = optimizations.filter(o => o.action === 'Source decrease').length;
    const noChangeCount = optimizations.filter(o => o.action === 'No change needed').length;

    const finding = `Analysis of ${summary.total_products} products reveals an average source elasticity of ${summary.avg_elasticity.toFixed(2)}. ${metrics.elastic_products} products have elastic demand (source-sensitive), while ${metrics.inelastic_products} have inelastic demand. Source optimization identifies ${totalGain > 0 ? `$${totalGain.toLocaleString()}` : '$0'} in potential revenue opportunities.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Elasticity Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              value={summary.total_products}
              label="Total Products"
              icon={Package}
              highlight
            />
            <MetricCard
              value={summary.avg_elasticity.toFixed(2)}
              label="Avg Elasticity"
              icon={Percent}
            />
            <MetricCard
              value={`$${(summary.total_revenue / 1000).toFixed(0)}K`}
              label="Total Revenue"
              icon={DollarSign}
            />
            <MetricCard
              value={totalGain > 0 ? `+$${(totalGain / 1000).toFixed(0)}K` : '$0'}
              label="Optimization Gain"
              icon={TrendingUp}
            />
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Demand Type Distribution</h4>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-lg p-4 border border-border bg-muted/10">
                <TrendingDown className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-medium">Elastic</p>
                <p className="text-2xl font-semibold">{metrics.elastic_products}</p>
                <p className="text-xs text-muted-foreground">
                  {((metrics.elastic_products / metrics.total_products) * 100).toFixed(1)}% of products
                </p>
              </div>

              <div className="rounded-lg p-4 border border-border bg-muted/10">
                <TrendingUp className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-medium">Inelastic</p>
                <p className="text-2xl font-semibold">{metrics.inelastic_products}</p>
                <p className="text-xs text-muted-foreground">
                  {((metrics.inelastic_products / metrics.total_products) * 100).toFixed(1)}% of products
                </p>
              </div>

              <div className="rounded-lg p-4 border border-border bg-muted/10">
                <BarChart3 className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-medium">Avg R²</p>
                <p className="text-2xl font-semibold">{metrics.avg_r_squared.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Model quality score</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Source Recommendations</h4>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                <ArrowUpCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-semibold">{increaseCount}</p>
                  <p className="text-xs text-muted-foreground">Increase Source</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                <ArrowDownCircle className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-semibold">{decreaseCount}</p>
                  <p className="text-xs text-muted-foreground">Decrease Source</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                <MinusCircle className="w-8 h-8 text-gray-600" />
                <div>
                  <p className="text-2xl font-semibold">{noChangeCount}</p>
                  <p className="text-xs text-muted-foreground">No Change</p>
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
            detail={`This lead scoring analysis uses log-linear regression to estimate source sensitivity for ${summary.total_products} products.

■ Average Source Elasticity: ${summary.avg_elasticity.toFixed(2)}
${summary.avg_elasticity < -1 
  ? `The average elasticity indicates elastic demand overall. A 1% source increase leads to approximately ${Math.abs(summary.avg_elasticity).toFixed(1)}% decrease in converted demanded. Products are source-sensitive, and volume-focused strategies are recommended.`
  : `The average elasticity indicates inelastic demand overall. A 1% source increase leads to approximately ${Math.abs(summary.avg_elasticity).toFixed(1)}% decrease in converted demanded. Products are less source-sensitive, allowing for margin-focused pricing strategies.`}

■ Demand Classification
• Elastic Products (${metrics.elastic_products}): High source sensitivity. Lowering sources can increase total revenue by driving volume growth that exceeds the source reduction.
• Inelastic Products (${metrics.inelastic_products}): Low source sensitivity. Raising sources can increase total revenue as volume loss is smaller than the source gain.

■ Model Quality: Average R² = ${metrics.avg_r_squared.toFixed(2)}
${metrics.avg_r_squared > 0.7
  ? `Strong predictive power. The model explains ${(metrics.avg_r_squared * 100).toFixed(0)}% of demand variance, indicating high confidence in elasticity estimates.`
  : metrics.avg_r_squared > 0.4
  ? `Moderate fit. The model explains ${(metrics.avg_r_squared * 100).toFixed(0)}% of demand variance. Recommendations should be validated with A/B testing.`
  : `Weak fit. The model explains only ${(metrics.avg_r_squared * 100).toFixed(0)}% of demand variance, suggesting other factors beyond source significantly influence demand.`}

■ Revenue Optimization Opportunity: ${totalGain > 0 ? `$${totalGain.toLocaleString()}` : '$0'}
${totalGain > 0
  ? `Source optimization analysis identifies ${totalGain > 10000 ? 'significant' : 'moderate'} revenue opportunities through strategic source adjustments. ${increaseCount} products should increase sources, ${decreaseCount} should decrease sources, and ${noChangeCount} are already near-optimal.`
  : `Current pricing is near-optimal across the portfolio. Only minor adjustments are recommended, indicating effective pricing management.`}`}
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
        title: "Log-Linear Regression",
        content: "Transforms source and converted data using logarithms, then fits a linear model: log(Q) = a + E × log(P). The coefficient E is the source elasticity. This method assumes constant elasticity across the source range and provides robust estimates even with noise."
      },
      {
        num: 2,
        title: "Elasticity Interpretation",
        content: "Elasticity measures % change in converted per 1% change in source. E = -1.5 means 1% source increase causes 1.5% converted decrease. Negative values confirm normal goods (source ↑ → demand ↓). Magnitude determines source sensitivity."
      },
      {
        num: 3,
        title: "Revenue Optimization",
        content: "Calculates Revenue = Source × Converted for each source point, where Q(P) = Q₀ × (P/P₀)^E. Uses scipy optimization to find the source that maximizes revenue within ±30% of current source. Accounts for demand response to source changes."
      },
      {
        num: 4,
        title: "Model Quality (R²)",
        content: `R² measures how well source explains demand variation. Current average: ${results.results.metrics.avg_r_squared.toFixed(2)}. Values >0.7 indicate strong fit, 0.4-0.7 moderate fit, <0.4 weak fit suggesting other factors (seasonality, competition) dominate.`
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
          <FindingBox finding="Demand elasticity analysis uses log-linear regression to estimate source sensitivity, then optimizes sources to maximize revenue. This methodology is widely used in economics and pricing strategy." />

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
            <h4 className="font-medium text-sm">Pricing Strategy Framework</h4>
            <div className="space-y-3">
              {[
                {
                  type: "Elastic Demand (|E| > 1)",
                  strategy: "Volume Focus",
                  tactics: ["Source Reductions", "Promotions", "Bundle Discounts", "Volume Pricing"],
                  reasoning: "Customers are source-sensitive. Small source decreases drive large volume increases, boosting total revenue.",
                  example: "E = -2.0: 10% source cut → 20% volume increase → +8% revenue"
                },
                {
                  type: "Inelastic Demand (|E| < 1)",
                  strategy: "Margin Focus",
                  tactics: ["Source Increases", "Premium Positioning", "Value-Based Pricing", "Quality Emphasis"],
                  reasoning: "Customers are less source-sensitive. Source increases don't significantly hurt volume, improving margins and revenue.",
                  example: "E = -0.5: 10% source increase → 5% volume decrease → +4.5% revenue"
                },
                {
                  type: "Unit Elastic (|E| = 1)",
                  strategy: "Non-Source Focus",
                  tactics: ["Quality Improvements", "Service Enhancement", "Brand Building", "Feature Addition"],
                  reasoning: "Source changes don't affect total revenue. Compete on value, quality, and differentiation instead of source.",
                  example: "E = -1.0: Any source change → Proportional converted change → Revenue constant"
                }
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="mb-2">
                    <p className="font-medium">{item.type}</p>
                    <p className="text-xs text-muted-foreground">{item.reasoning}</p>
                  </div>
                  <p className="text-xs font-medium text-primary mb-2">Strategy: {item.strategy}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.tactics.map(tactic => (
                      <Badge key={tactic} variant="outline" className="text-xs">
                        {tactic}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic">{item.example}</p>
                </div>
              ))}
            </div>
          </div>

          <DetailParagraph
            title="Implementation Roadmap"
            detail={`Step-by-step guide for implementing elasticity-based pricing strategies.

■ Phase 1: Analysis & Validation (Week 1-2)
• Run elasticity analysis on historical data
• Validate R² scores (target >0.4 for reliability)
• Identify top revenue opportunities
• Segment products by elasticity category

■ Phase 2: Strategy Development (Week 3-4)
• Elastic products: Design volume-driving promotions
• Inelastic products: Develop premium positioning
• Set pricing guardrails (prevent extreme changes)
• Prepare A/B test plans

■ Phase 3: Testing (Week 5-8)
• Start with high-confidence products (R² >0.7)
• Implement small source changes (5-10% initially)
• A/B test against control group
• Monitor: conversion rate, revenue, customer satisfaction

■ Phase 4: Rollout (Week 9-12)
• Apply successful strategies across portfolio
• Set up automated monitoring dashboards
• Establish quarterly re-analysis schedule
• Document learnings and refine approach

■ Ongoing: Monitoring & Refinement
• Track actual vs predicted elasticity
• Re-run analysis quarterly
• Adjust for market changes (competition, seasonality)
• Expand to customer segment-level analysis

■ Key Success Metrics
• Revenue improvement vs baseline
• Elasticity prediction accuracy
• Customer retention (ensure source changes don't harm loyalty)
• Margin improvement for inelastic products
• Volume growth for elastic products

■ Common Pitfalls to Avoid
• Over-optimizing: Start conservative (5-10% changes)
• Ignoring competition: Monitor competitive response
• Short-term thinking: Balance immediate revenue vs brand value
• One-size-fits-all: Different strategies for elastic vs inelastic
• Set-and-forget: Markets evolve; re-analyze regularly`}
          />

          <Card className="border-border bg-muted/10">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm mb-2">Disclaimer</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This report is a decision-making support tool derived from statistical algorithms. 
                    The analysis provides probabilistic estimates based on historical data; actual results 
                    may vary depending on data integrity and unpredictable market variables. This information 
                    does not guarantee specific outcomes, and the final responsibility for any decisions 
                    rests solely with the user.
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
    const elasticities = r.elasticity_by_product.slice(0, 20);
    const optimizations = r.optimization_results.sort((a, b) => b.revenue_change - a.revenue_change).slice(0, 20);

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Lead Scoring Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Source Optimization & Revenue Forecasting | {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={summary.total_products} label="Products" highlight />
              <MetricCard value={summary.avg_elasticity.toFixed(2)} label="Avg Elasticity" />
              <MetricCard value={`$${(summary.total_revenue / 1000).toFixed(0)}K`} label="Total Revenue" />
              <MetricCard 
                value={r.optimization_results.reduce((sum, o) => sum + o.revenue_change, 0) > 0 
                  ? `+$${(r.optimization_results.reduce((sum, o) => sum + o.revenue_change, 0) / 1000).toFixed(0)}K` 
                  : '$0'
                } 
                label="Revenue Opportunity" 
              />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Source elasticity analysis was performed on {summary.total_products} products using log-linear regression. 
              Average elasticity is {summary.avg_elasticity.toFixed(2)}, with {r.metrics.elastic_products} elastic products 
              and {r.metrics.inelastic_products} inelastic products. Total historical revenue: ${summary.total_revenue.toLocaleString()}.
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
                {visualizations.elasticity_distribution && <TabsTrigger value="elasticity_distribution" className="text-xs">Elasticity</TabsTrigger>}
                {visualizations.source_converted_scatter && <TabsTrigger value="source_converted_scatter" className="text-xs">Source-Converted</TabsTrigger>}
                {visualizations.revenue_by_product && <TabsTrigger value="revenue_by_product" className="text-xs">Revenue</TabsTrigger>}
                {visualizations.demand_type_distribution && <TabsTrigger value="demand_type_distribution" className="text-xs">Demand Types</TabsTrigger>}
                {visualizations.optimization_comparison && <TabsTrigger value="optimization_comparison" className="text-xs">Optimization</TabsTrigger>}
                {visualizations.source_recommendations && <TabsTrigger value="source_recommendations" className="text-xs">Recommendations</TabsTrigger>}
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
            <CardTitle className="text-base">Elasticity Results (Top 20 Products)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Elasticity</TableHead>
                  <TableHead>Demand Type</TableHead>
                  <TableHead className="text-right">Avg Source</TableHead>
                  <TableHead className="text-right">Avg Qty</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">R²</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {elasticities.map((e, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{e.lead_id}</TableCell>
                    <TableCell className="text-right">{e.elasticity.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={e.demand_type === "Elastic" ? "default" : "secondary"} className="text-xs">
                        {e.demand_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">${e.avg_source.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{e.avg_converted.toFixed(0)}</TableCell>
                    <TableCell className="text-right">${e.total_revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{e.r_squared.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Source Optimization (Top 20 Opportunities)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Current Source</TableHead>
                  <TableHead className="text-right">Optimal Source</TableHead>
                  <TableHead className="text-right">Change %</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead className="text-right">Revenue Gain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {optimizations.map((opt, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{opt.lead_id}</TableCell>
                    <TableCell className="text-right">${opt.current_source.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${opt.optimal_source.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <span className={opt.source_change_pct > 0 ? "text-green-600" : opt.source_change_pct < 0 ? "text-blue-600" : ""}>
                        {opt.source_change_pct > 0 ? '+' : ''}{opt.source_change_pct.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {opt.action === 'Source increase' && <ArrowUpCircle className="w-3 h-3 mr-1" />}
                        {opt.action === 'Source decrease' && <ArrowDownCircle className="w-3 h-3 mr-1" />}
                        {opt.action === 'No change needed' && <MinusCircle className="w-3 h-3 mr-1" />}
                        {opt.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      +${opt.revenue_change.toFixed(2)}
                    </TableCell>
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
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2">
                <FileText className="w-4 h-4" />
                CSV (Elasticities)
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
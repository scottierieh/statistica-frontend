"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Shield, Info, BookOpen,
  FileText, Download, Settings, Activity, ChevronRight, PieChart, TrendingUp,
  BarChart3, Target, DollarSign, Percent, Layers
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface AssetMetric {
  asset: string;
  weight: number;
  expected_return: number;
  volatility: number;
  sharpe: number;
}

interface PortfolioResult {
  success: boolean;
  results: {
    optimization_method: string;
    n_assets: number;
    n_periods: number;
    optimal_weights: { [key: string]: number };
    portfolio_metrics: {
      expected_return: number;
      volatility: number;
      sharpe_ratio: number;
    };
    asset_metrics: AssetMetric[];
  };
  visualizations: {
    allocation_pie?: string;
    efficient_frontier?: string;
    correlation_matrix?: string;
    risk_return_bars?: string;
    weights_bar?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    n_assets: number;
    expected_return: number;
    volatility: number;
    sharpe_ratio: number;
  };
}

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const startDate = new Date('2023-01-01');
  let stock_a = 100, stock_b = 50, stock_c = 75, bond_a = 100;
  
  for (let i = 0; i < 252; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const market = (Math.random() - 0.48) * 0.02;
    stock_a *= (1 + market + (Math.random() - 0.5) * 0.02);
    stock_b *= (1 + market * 0.8 + (Math.random() - 0.5) * 0.025);
    stock_c *= (1 + market * 0.6 + (Math.random() - 0.5) * 0.015);
    bond_a *= (1 + (Math.random() - 0.5) * 0.005);
    data.push({
      date: date.toISOString().split('T')[0],
      stock_a: parseFloat(stock_a.toFixed(2)),
      stock_b: parseFloat(stock_b.toFixed(2)),
      stock_c: parseFloat(stock_c.toFixed(2)),
      bond_a: parseFloat(bond_a.toFixed(2))
    });
  }
  return data;
};

const MetricCard: React.FC<{ value: string | number; label: string; icon?: React.FC<{ className?: string }>; highlight?: boolean; }> = ({ value, label, icon: Icon, highlight }) => (
  <div className={`text-center p-4 rounded-lg border ${highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
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
    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{title || "Detailed Analysis"}</p>
    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{detail}</p>
  </div>
);

const DataPreview: React.FC<{ data: DataRow[]; columns: string[] }> = ({ data, columns }) => {
  const [expanded, setExpanded] = useState(false);
  if (data.length === 0) return null;
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} rows × {columns.length} columns</Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader><TableRow>{columns.map(col => <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{data.slice(0, 10).map((row, i) => <TableRow key={i}>{columns.map(col => <TableCell key={col} className="text-xs py-1.5">{row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}</TableCell>)}</TableRow>)}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{ currentStep: number; hasResults: boolean; onStepClick: (step: number) => void }> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [
    { num: 1, label: "Intro" }, { num: 2, label: "Config" }, { num: 3, label: "Validation" },
    { num: 4, label: "Summary" }, { num: 5, label: "Methodology" }, { num: 6, label: "Report" }
  ];
  return (
    <div className="flex items-center justify-center gap-0.5 mb-8 flex-wrap">
      {steps.map((step, idx) => {
        const isCompleted = step.num < currentStep;
        const isCurrent = step.num === currentStep;
        const isAccessible = step.num <= 3 || hasResults;
        return (
          <React.Fragment key={step.num}>
            <button onClick={() => isAccessible && onStepClick(step.num)} disabled={!isAccessible}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                isCurrent ? "bg-primary text-primary-foreground" : isCompleted ? "bg-primary/10 text-primary" :
                isAccessible ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
              }`}>
              {step.label}
            </button>
            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};


const PortfolioGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Portfolio Optimization Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              What is Portfolio Optimization?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Portfolio optimization uses Modern Portfolio Theory (MPT) to find the best asset allocation that maximizes 
              returns for a given level of risk, or minimizes risk for a target return. Developed by Harry Markowitz 
              (1952 Nobel Prize), MPT revolutionized investing by treating portfolios as integrated wholes rather than 
              collections of individual securities.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3">Optimization Methods</h3>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Maximize Sharpe Ratio</p>
                <p className="text-xs text-muted-foreground">
                  Finds the portfolio with the best risk-adjusted returns. Sharpe ratio = (Return - Risk_Free_Rate) / Volatility. 
                  Higher is better. Recommended for most investors seeking efficient diversification.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Minimize Variance</p>
                <p className="text-xs text-muted-foreground">
                  Creates the portfolio with lowest volatility (risk). Ideal for conservative investors who prioritize 
                  capital preservation over high returns. Results in most stable portfolio.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Maximize Return</p>
                <p className="text-xs text-muted-foreground">
                  Seeks highest expected return without explicitly limiting risk. Suitable for aggressive investors with 
                  high risk tolerance. May result in concentrated positions.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3">Key Metrics Explained</h3>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Expected Return</p>
                <p className="text-xs text-muted-foreground">
                  Annualized average return based on historical performance. Represents anticipated annual gain. 
                  Higher returns typically come with increased risk.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Volatility (Risk)</p>
                <p className="text-xs text-muted-foreground">
                  Standard deviation of returns, measuring price fluctuations. Lower volatility = more stable returns. 
                  Annual volatility of 15% means typical yearly swings of ±15%.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Sharpe Ratio</p>
                <p className="text-xs text-muted-foreground">
                  Risk-adjusted return metric. Measures excess return per unit of risk. 
                  {'>'} 1.5 = Excellent | 1-1.5 = Good | 0.5-1 = Fair | {'<'} 0.5 = Poor
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3">Understanding Efficient Frontier</h3>
            <p className="text-sm text-muted-foreground mb-3">
              The efficient frontier is a curve showing optimal portfolios that offer maximum return for each level of risk.
            </p>
            <div className="p-3 rounded-lg border border-border bg-muted/10">
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><strong>On the curve:</strong> Optimal portfolios - best risk-return combinations</li>
                <li><strong>Below the curve:</strong> Suboptimal - can improve return or reduce risk</li>
                <li><strong>Above the curve:</strong> Impossible with current assets</li>
                <li><strong>Red star:</strong> Your optimized portfolio location</li>
                <li><strong>Blue dots:</strong> Individual assets for comparison</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3">Diversification Benefits</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Diversification reduces risk when assets don't move perfectly together (correlation {'<'} 1). 
              Portfolio volatility can be lower than any individual asset's volatility.
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm mb-1">Benefits</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Reduces unsystematic risk</li>
                  <li>• Smoother return patterns</li>
                  <li>• Better risk-adjusted returns</li>
                  <li>• Lower maximum drawdowns</li>
                </ul>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Limitations</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Can't eliminate systematic risk</li>
                  <li>• Correlations change in crises</li>
                  <li>• May limit upside potential</li>
                  <li>• Requires regular rebalancing</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3">Constraints & Settings</h3>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Risk-Free Rate</p>
                <p className="text-xs text-muted-foreground">
                  Baseline return (typically treasury rate). Used to calculate Sharpe ratio. 
                  Default 2% represents safe alternative investment.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Min/Max Weight</p>
                <p className="text-xs text-muted-foreground">
                  Constraints on individual asset allocation. Min weight forces diversification. 
                  Max weight prevents over-concentration. Example: 0% min, 40% max limits any single asset.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3">Reading the Correlation Matrix</h3>
            <div className="p-3 rounded-lg border border-border bg-muted/10">
              <p className="text-xs text-muted-foreground space-y-1">
                <strong>1.0 (Red):</strong> Perfect positive correlation - assets move together<br/>
                <strong>0.0 (White):</strong> No correlation - independent movements<br/>
                <strong>-1.0 (Blue):</strong> Perfect negative correlation - opposite movements<br/>
                <strong>Low correlation:</strong> Better diversification benefits<br/>
                <strong>High correlation:</strong> Limited diversification, higher portfolio risk
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3">Implementation Best Practices</h3>
            <div className="space-y-2">
              <div className="p-2 rounded border border-border bg-muted/10">
                <p className="font-medium text-sm">Rebalance Quarterly</p>
                <p className="text-xs text-muted-foreground">Review portfolio when positions drift beyond ±5% of targets</p>
              </div>
              <div className="p-2 rounded border border-border bg-muted/10">
                <p className="font-medium text-sm">Monitor Correlations</p>
                <p className="text-xs text-muted-foreground">Check correlation matrix quarterly - diversification changes with markets</p>
              </div>
              <div className="p-2 rounded border border-border bg-muted/10">
                <p className="font-medium text-sm">Consider Transaction Costs</p>
                <p className="text-xs text-muted-foreground">Frequent rebalancing incurs trading fees - balance optimization with costs</p>
              </div>
              <div className="p-2 rounded border border-border bg-muted/10">
                <p className="font-medium text-sm">Annual Re-optimization</p>
                <p className="text-xs text-muted-foreground">Update optimization yearly with fresh data to adapt to market changes</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Important:</strong> Portfolio optimization is based on historical data. 
              Past performance doesn't guarantee future results. This is educational analysis, not investment advice. 
              Consult qualified financial professionals before making investment decisions.
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
          <PieChart className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Portfolio Optimization</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Optimize asset allocation using Modern Portfolio Theory. Find the efficient frontier and maximize risk-adjusted returns.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Target, title: "Max Sharpe", desc: "Best risk/return" },
          { icon: Shield, title: "Min Risk", desc: "Lowest volatility" },
          { icon: TrendingUp, title: "Max Return", desc: "Highest gain" }
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="p-5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Info className="w-5 h-5 text-primary" />When to Use</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Price data for 2+ assets", "Date column", "30+ periods"].map(req => (
                  <li key={req} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{req}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Optimal weights", "Expected return", "Risk metrics", "Efficient frontier"].map(res => (
                  <li key={res} className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />{res}
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
            <Button onClick={onLoadSample} className="gap-2"><Activity className="w-4 h-4" />Load Sample Data</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" />Upload Your Data
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileUpload} className="hidden" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function PortfolioOptimizationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<PortfolioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const [dateCol, setDateCol] = useState<string>("");
  const [assetCols, setAssetCols] = useState<string[]>([]);
  const [optimizationMethod, setOptimizationMethod] = useState<string>("max_sharpe");
  const [riskFreeRate, setRiskFreeRate] = useState<number>(2);
  const [minWeight, setMinWeight] = useState<number>(0);
  const [maxWeight, setMaxWeight] = useState<number>(100);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setDateCol("date");
    setAssetCols(["stock_a", "stock_b", "stock_c", "bond_a"]);
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
      { name: "Date Column", passed: !!dateCol, message: dateCol || "Select date" },
      { name: "Assets", passed: assetCols.length >= 2, message: `${assetCols.length} assets (need ≥2)` },
      { name: "Data", passed: data.length >= 30, message: `${data.length} periods (need ≥30)` }
    ];
  }, [dateCol, assetCols, data.length]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        data, date_col: dateCol, asset_cols: assetCols, optimization_method: optimizationMethod,
        risk_free_rate: riskFreeRate / 100,
        constraints: { min_weight: minWeight / 100, max_weight: maxWeight / 100 }
      };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/portfolio-optimization`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      const result: PortfolioResult = await res.json();
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
    a.download = `portfolio_${chartKey}.png`;
    a.click();
  };

  const availableAssets = columns.filter(c => c !== dateCol);

  const renderStep2Config = () => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure Portfolio</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {/* Column Selection */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date Column</Label>
            <Select value={dateCol} onValueChange={setDateCol}>
              <SelectTrigger><SelectValue placeholder="Select date column..." /></SelectTrigger>
              <SelectContent>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Column containing dates</p>
          </div>

          <div className="space-y-2">
            <Label>Asset Columns (Select 2+)</Label>
            <div className="border rounded-lg p-3 bg-muted/20">
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {availableAssets.map(asset => (
                    <div key={asset} className="flex items-center space-x-2">
                      <Checkbox 
                        id={asset} 
                        checked={assetCols.includes(asset)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAssetCols(prev => [...prev, asset]);
                          } else {
                            setAssetCols(prev => prev.filter(a => a !== asset));
                          }
                        }}
                      />
                      <label htmlFor={asset} className="text-sm cursor-pointer flex-1">
                        {asset}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {assetCols.length} asset{assetCols.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <Separator />

        {/* Optimization Method Cards */}
        <div className="space-y-3">
          <Label>Optimization Method</Label>
          <div className="grid md:grid-cols-3 gap-3">
            <div
              onClick={() => setOptimizationMethod('max_sharpe')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                optimizationMethod === 'max_sharpe'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-primary" />
                <p className="font-semibold text-sm">Max Sharpe</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Best risk-adjusted returns. Balances return and risk optimally.
              </p>
              {optimizationMethod === 'max_sharpe' && (
                <Badge variant="default" className="mt-2 text-xs">Selected</Badge>
              )}
            </div>

            <div
              onClick={() => setOptimizationMethod('min_variance')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                optimizationMethod === 'min_variance'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                <p className="font-semibold text-sm">Min Variance</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Lowest risk. Prioritizes stability over returns.
              </p>
              {optimizationMethod === 'min_variance' && (
                <Badge variant="default" className="mt-2 text-xs">Selected</Badge>
              )}
            </div>

            <div
              onClick={() => setOptimizationMethod('max_return')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                optimizationMethod === 'max_return'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <p className="font-semibold text-sm">Max Return</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Highest returns. Aggressive risk tolerance.
              </p>
              {optimizationMethod === 'max_return' && (
                <Badge variant="default" className="mt-2 text-xs">Selected</Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <strong>Tip:</strong> Max Sharpe is recommended for most investors - it finds the best balance between risk and return.
          </p>
        </div>

        <Separator />

        {/* Parameters */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Risk-Free Rate: {riskFreeRate}%</Label>
            <Input 
              type="number" 
              value={riskFreeRate} 
              onChange={(e) => setRiskFreeRate(Number(e.target.value))} 
              step={0.1} 
              min={0} 
              max={20} 
            />
            <p className="text-xs text-muted-foreground">
              Baseline return rate (e.g., Treasury bond). Typical: 2-4%
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Weight per Asset: {minWeight}%</Label>
              <Input 
                type="number" 
                value={minWeight} 
                onChange={(e) => setMinWeight(Number(e.target.value))} 
                step={1} 
                min={0} 
                max={100} 
              />
              <p className="text-xs text-muted-foreground">
                Force diversification (0% = no minimum)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Max Weight per Asset: {maxWeight}%</Label>
              <Input 
                type="number" 
                value={maxWeight} 
                onChange={(e) => setMaxWeight(Number(e.target.value))} 
                step={1} 
                min={0} 
                max={100} 
              />
              <p className="text-xs text-muted-foreground">
                Prevent concentration (30-40% recommended)
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => setCurrentStep(3)} className="gap-2">Continue <ArrowRight className="w-4 h-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    const canRun = checks.every(c => c.passed);

    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-primary" />Validation</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {checks.map((check, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${check.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex items-center gap-3">
                  {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
                  <div>
                    <p className="font-medium text-sm">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.message}</p>
                  </div>
                </div>
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
              {loading ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Optimizing...</> : <>Optimize<ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep4Summary = () => {
    if (!results) return null;
    const { summary, results: r, key_insights } = results;
    const pm = r.portfolio_metrics;
    
    const finding = `Optimized portfolio of ${summary.n_assets} assets achieves ${summary.expected_return.toFixed(1)}% expected annual return with ${summary.volatility.toFixed(1)}% volatility (risk). Sharpe ratio of ${summary.sharpe_ratio.toFixed(2)} indicates ${summary.sharpe_ratio > 1.5 ? 'excellent' : summary.sharpe_ratio > 1 ? 'good' : 'moderate'} risk-adjusted performance. Portfolio diversification reduces individual asset risk through correlation benefits.`;

    const topWeights = Object.entries(r.optimal_weights).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const diversification = Object.values(r.optimal_weights).filter(w => w > 0.01).length;
    const concentration = Math.max(...Object.values(r.optimal_weights));

    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><PieChart className="w-5 h-5 text-primary" />Portfolio Optimization Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />

          {/* Primary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={`${summary.expected_return.toFixed(1)}%`} label="Expected Return" icon={TrendingUp} highlight />
            <MetricCard value={`${summary.volatility.toFixed(1)}%`} label="Volatility (Risk)" icon={Activity} />
            <MetricCard value={summary.sharpe_ratio.toFixed(2)} label="Sharpe Ratio" icon={Target} />
            <MetricCard value={summary.n_assets} label="Total Assets" icon={Layers} />
          </div>

          {/* Portfolio Characteristics */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Portfolio Characteristics</h4>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Diversification</p>
                <p className="text-lg font-semibold">{diversification} Assets</p>
                <p className="text-xs text-muted-foreground">
                  {diversification >= r.n_assets * 0.8 ? 'Well diversified' : diversification >= r.n_assets * 0.5 ? 'Moderately diversified' : 'Concentrated'}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Largest Position</p>
                <p className="text-lg font-semibold">{(concentration * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {concentration > 0.5 ? 'High concentration' : concentration > 0.3 ? 'Moderate concentration' : 'Well balanced'}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Return/Risk Ratio</p>
                <p className="text-lg font-semibold">{(pm.expected_return / pm.volatility).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Units of return per risk</p>
              </div>
            </div>
          </div>

          {/* Top Holdings */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Top Holdings</h4>
            <div className="space-y-2">
              {topWeights.map(([asset, weight], idx) => (
                <div key={asset} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                  <Badge variant="outline" className="w-8 h-8 flex items-center justify-center shrink-0">
                    {idx + 1}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{asset}</span>
                      <Badge variant="secondary">{(weight * 100).toFixed(1)}%</Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${weight * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {topWeights.length < Object.keys(r.optimal_weights).length && (
              <p className="text-xs text-muted-foreground text-center">
                Showing top 5 of {Object.keys(r.optimal_weights).length} assets
              </p>
            )}
          </div>

          {/* Performance Benchmarks */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Performance Analysis</h4>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Risk-Adjusted Return</p>
                  <Badge variant="outline">
                    {pm.sharpe_ratio > 1.5 ? 'Excellent' : pm.sharpe_ratio > 1 ? 'Good' : pm.sharpe_ratio > 0.5 ? 'Fair' : 'Poor'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sharpe ratio of {pm.sharpe_ratio.toFixed(2)} means {pm.sharpe_ratio.toFixed(2)} units of return per unit of risk.
                  {pm.sharpe_ratio > 1 ? ' Portfolio offers attractive risk-adjusted returns.' : ' Consider if expected return justifies the risk.'}
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Volatility Assessment</p>
                  <Badge variant="outline">
                    {pm.volatility < 0.1 ? 'Low' : pm.volatility < 0.2 ? 'Moderate' : 'High'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pm.volatility * 100}% annualized volatility represents the portfolio's price fluctuation range.
                  {pm.volatility < 0.15 ? ' Relatively stable portfolio.' : ' Higher volatility suggests larger price swings.'}
                </p>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          {key_insights && key_insights.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Key Insights</h4>
              {key_insights.map((insight, idx) => (
                <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  insight.status === "positive" ? "border-primary/30 bg-primary/5" :
                  insight.status === "warning" ? "border-border bg-muted/10" :
                  "border-border bg-muted/10"
                }`}>
                  {insight.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> :
                   insight.status === "warning" ? <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" /> :
                   <Info className="w-5 h-5 text-muted-foreground shrink-0" />}
                  <div>
                    <p className="font-medium text-sm">{insight.title}</p>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Individual Asset Performance */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Individual Asset Metrics</h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Asset</TableHead>
                    <TableHead className="text-xs text-right">Weight</TableHead>
                    <TableHead className="text-xs text-right">Return</TableHead>
                    <TableHead className="text-xs text-right">Risk</TableHead>
                    <TableHead className="text-xs text-right">Sharpe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.asset_metrics.sort((a, b) => b.weight - a.weight).slice(0, 5).map((asset) => (
                    <TableRow key={asset.asset}>
                      <TableCell className="text-xs font-medium">{asset.asset}</TableCell>
                      <TableCell className="text-xs text-right">{(asset.weight * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-xs text-right">{(asset.expected_return * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-xs text-right">{(asset.volatility * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-xs text-right">{asset.sharpe.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DetailParagraph title="Optimization Analysis" detail={`Modern Portfolio Theory optimization using ${r.optimization_method.replace('_', ' ')} method across ${r.n_periods} historical periods.

■ Expected Return: ${(pm.expected_return * 100).toFixed(2)}%
Annualized expected return based on historical performance. This represents the portfolio's anticipated annual gain.
${pm.expected_return > 0.15 ? 'High return target - comes with increased risk exposure.' : pm.expected_return > 0.08 ? 'Moderate return target - balanced risk-reward profile.' : 'Conservative return target - prioritizes capital preservation.'}

■ Volatility (Risk): ${(pm.volatility * 100).toFixed(2)}%
Standard deviation measuring portfolio price fluctuations. Lower volatility indicates more stable returns.
${pm.volatility < 0.1 ? 'Low volatility suggests stable, predictable returns with minimal price swings.' : pm.volatility < 0.2 ? 'Moderate volatility - expect typical market fluctuations.' : 'High volatility - portfolio may experience significant price movements.'}

■ Sharpe Ratio: ${pm.sharpe_ratio.toFixed(3)}
Risk-adjusted return metric. Measures excess return per unit of risk taken.
${pm.sharpe_ratio > 1.5 ? 'Excellent - portfolio offers strong returns relative to risk. Well-optimized allocation.' : pm.sharpe_ratio > 1 ? 'Good - attractive risk-adjusted returns. Portfolio efficiently balances risk and reward.' : pm.sharpe_ratio > 0.5 ? 'Fair - acceptable risk-adjusted returns. Consider if expected gains justify volatility.' : 'Poor - returns may not adequately compensate for risk taken. Review allocation strategy.'}

■ Diversification Benefits
Portfolio uses ${diversification} out of ${r.n_assets} available assets with largest single position at ${(concentration * 100).toFixed(1)}%.
${diversification >= r.n_assets * 0.8 ? 'Excellent diversification reduces unsystematic risk through broad asset allocation.' : diversification >= r.n_assets * 0.5 ? 'Moderate diversification provides some risk reduction benefits.' : 'Limited diversification - portfolio may be exposed to concentrated risks.'}

■ Optimization Method: ${r.optimization_method.replace('_', ' ').toUpperCase()}
${r.optimization_method === 'max_sharpe' 
  ? 'Maximizes Sharpe ratio to find optimal balance between return and risk. Best for investors seeking efficient risk-adjusted returns.'
  : r.optimization_method === 'min_variance'
  ? 'Minimizes portfolio volatility to create most stable allocation. Ideal for risk-averse investors prioritizing capital preservation.'
  : 'Maximizes expected return without risk constraints. Suitable for aggressive investors with high risk tolerance.'}

■ Practical Considerations
- Rebalance quarterly to maintain target allocation
- Monitor correlation changes - diversification benefits vary with market conditions
- Consider transaction costs when implementing allocation
- Review allocation annually or after major market events
- Past performance does not guarantee future results`} />

          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">Continue <ArrowRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Methodology = () => {
    if (!results) return null;
    const r = results.results;
    
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="w-5 h-5 text-primary" />Modern Portfolio Theory Methodology</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Portfolio optimization applies Harry Markowitz's Modern Portfolio Theory (MPT) to find the optimal asset allocation that maximizes risk-adjusted returns through mathematical optimization and diversification principles." />

          <div className="space-y-4">
            <h4 className="font-medium text-sm">Core Components</h4>
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">1</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Historical Returns Calculation</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Price data converted to periodic returns to measure asset performance over time.
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground font-mono">
                        Return_t = (Price_t - Price_t-1) / Price_t-1<br/>
                        Annualized: × 252 trading days per year<br/>
                        Based on {r.n_periods} historical periods
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">2</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Statistical Parameters</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Calculate expected returns, volatilities, and correlations between assets.
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground space-y-1">
                        <strong>Expected Return (μ):</strong> Mean(returns) × 252<br/>
                        <strong>Volatility (σ):</strong> StdDev(returns) × √252<br/>
                        <strong>Covariance Matrix (Σ):</strong> Measures correlations × 252<br/>
                        <strong>Risk-Free Rate (r_f):</strong> {riskFreeRate}% (benchmark return)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">3</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Optimization Objective</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Mathematical optimization finds optimal weights that maximize chosen objective.
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground space-y-1">
                        {optimizationMethod === 'max_sharpe' ? (
                          <>
                            <strong>Maximize Sharpe Ratio:</strong><br/>
                            Sharpe = (Portfolio_Return - Risk_Free_Rate) / Portfolio_Volatility<br/>
                            Finds best risk-adjusted returns - optimal balance of return and risk<br/>
                            Higher Sharpe = More return per unit of risk taken
                          </>
                        ) : optimizationMethod === 'min_variance' ? (
                          <>
                            <strong>Minimize Variance:</strong><br/>
                            Variance = w^T Σ w (where w = weights, Σ = covariance matrix)<br/>
                            Finds lowest risk portfolio - minimizes volatility<br/>
                            Best for risk-averse investors prioritizing stability
                          </>
                        ) : (
                          <>
                            <strong>Maximize Expected Return:</strong><br/>
                            Return = Σ (weight_i × expected_return_i)<br/>
                            Finds highest return portfolio regardless of risk<br/>
                            Suitable for aggressive investors with high risk tolerance
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">4</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Constraints & Bounds</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Optimization subject to practical investment constraints.
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground space-y-1">
                        <strong>Weight Sum Constraint:</strong> Σ weights = 1 (100% allocation)<br/>
                        <strong>Min Weight per Asset:</strong> {minWeight}% (minimum allocation)<br/>
                        <strong>Max Weight per Asset:</strong> {maxWeight}% (maximum allocation)<br/>
                        <strong>No Short Selling:</strong> All weights ≥ 0 (long-only portfolio)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">5</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Portfolio Metrics Calculation</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Calculate final portfolio characteristics using optimal weights.
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground font-mono space-y-1">
                        Portfolio_Return = Σ (w_i × μ_i)<br/>
                        Portfolio_Volatility = √(w^T Σ w)<br/>
                        Sharpe_Ratio = (Return - r_f) / Volatility<br/>
                        Diversification = Count(weights {'>'} 1%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <DetailParagraph title="Efficient Frontier Concept" detail={`■ What is the Efficient Frontier?
The efficient frontier is a curve showing portfolios that offer:
- Maximum expected return for a given level of risk
- Minimum risk for a given level of expected return

All optimal portfolios lie on this frontier. Portfolios below the frontier are suboptimal - they have either lower returns for the same risk, or higher risk for the same returns.

■ How It's Generated
1. Create 100 portfolios with different target returns
2. For each target return, minimize volatility
3. Plot volatility (x-axis) vs return (y-axis)
4. Connect points to form efficient frontier curve

The optimal portfolio (red star) sits on this frontier at the point of highest Sharpe ratio.

■ Interpretation
- Points on the curve: Optimal risk-return combinations
- Point above curve: Impossible with current assets
- Point below curve: Suboptimal - can improve return or reduce risk
- Your portfolio: Marked with red star showing optimization result`} />

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Mathematical Foundation</h4>
            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <p className="text-sm text-muted-foreground mb-3">
                Modern Portfolio Theory, developed by Harry Markowitz (1952 Nobel Prize), revolutionized investment by 
                treating portfolios as integrated wholes rather than collections of individual securities.
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p><strong>Key Insight:</strong> Diversification reduces risk when assets don't move perfectly together (correlation {'<'} 1)</p>
                <p><strong>Risk Types:</strong> Systematic (market-wide, unavoidable) vs Unsystematic (asset-specific, diversifiable)</p>
                <p><strong>Optimization:</strong> Sequential Least Squares Programming (SLSQP) finds optimal weights efficiently</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Practical Application</h4>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Portfolio Construction</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use optimization weights as target allocation</li>
                  <li>• Rebalance quarterly to maintain targets</li>
                  <li>• Consider transaction costs when trading</li>
                  <li>• Adjust for tax implications if applicable</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Risk Management</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Monitor portfolio volatility vs targets</li>
                  <li>• Review correlation changes quarterly</li>
                  <li>• Set stop-loss limits for large positions</li>
                  <li>• Diversify across asset classes when possible</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Performance Tracking</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Compare actual vs expected returns monthly</li>
                  <li>• Track Sharpe ratio over time</li>
                  <li>• Measure tracking error vs benchmark</li>
                  <li>• Calculate attribution for deviations</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Regular Review</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Re-optimize annually with updated data</li>
                  <li>• Adjust for changed market conditions</li>
                  <li>• Review asset correlations for changes</li>
                  <li>• Update risk-free rate assumptions</li>
                </ul>
              </div>
            </div>
          </div>

          <Card className="border-border bg-muted/10">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm mb-2">Important Limitations</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Historical Data:</strong> Past performance doesn't guarantee future results. Market conditions change.</li>
                    <li>• <strong>Normal Distribution:</strong> Assumes returns follow normal distribution. Real markets have fat tails (extreme events).</li>
                    <li>• <strong>Static Correlations:</strong> Asset correlations can change during crises (diversification may fail when needed most).</li>
                    <li>• <strong>Transaction Costs:</strong> Optimization ignores trading fees, bid-ask spreads, and tax implications.</li>
                    <li>• <strong>Estimation Error:</strong> Small errors in expected returns can lead to dramatically different optimal portfolios.</li>
                    <li>• <strong>Model Risk:</strong> MPT is a model - reality may not conform to assumptions.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">View Full Report <ArrowRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => {
    if (!results) return null;
    const { visualizations, results: r, summary, key_insights } = results;
    const pm = r.portfolio_metrics;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Portfolio Optimization Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {r.optimization_method.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} | {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <MetricCard value={`${summary.expected_return.toFixed(1)}%`} label="Expected Return" highlight />
              <MetricCard value={`${summary.volatility.toFixed(1)}%`} label="Volatility" />
              <MetricCard value={summary.sharpe_ratio.toFixed(2)} label="Sharpe Ratio" />
              <MetricCard value={summary.n_assets} label="Assets" />
              <MetricCard value={r.n_periods} label="Periods" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Portfolio optimization of {summary.n_assets} assets using {r.optimization_method.replace('_', ' ')} method 
              based on {r.n_periods} historical periods. Optimal allocation achieves {summary.expected_return.toFixed(1)}% 
              expected annual return with {summary.volatility.toFixed(1)}% volatility, resulting in Sharpe ratio of {summary.sharpe_ratio.toFixed(2)}.
              {pm.sharpe_ratio > 1.5 
                ? ' Excellent risk-adjusted performance indicates efficient portfolio construction.'
                : pm.sharpe_ratio > 1
                ? ' Good risk-adjusted performance demonstrates solid diversification benefits.'
                : ' Moderate risk-adjusted performance suggests room for optimization or strategy refinement.'
              }
              {' '}Portfolio uses {Object.values(r.optimal_weights).filter(w => w > 0.01).length} assets with 
              largest position at {(Math.max(...Object.values(r.optimal_weights)) * 100).toFixed(1)}%, providing 
              {Object.values(r.optimal_weights).filter(w => w > 0.01).length >= r.n_assets * 0.8 ? ' excellent' : ' moderate'} diversification.
            </p>
          </CardContent>
        </Card>

        {/* Key Insights */}
        {key_insights && key_insights.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Key Insights</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {key_insights.map((ins, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  ins.status === "warning" ? "border-border bg-muted/10" :
                  ins.status === "positive" ? "border-primary/30 bg-primary/5" :
                  "border-border bg-muted/10"
                }`}>
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

        {/* Portfolio Composition */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Portfolio Composition</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-3">Optimal Allocation</h4>
                <div className="space-y-2">
                  {Object.entries(r.optimal_weights)
                    .sort((a, b) => b[1] - a[1])
                    .filter(([_, weight]) => weight > 0.001)
                    .map(([asset, weight], idx) => (
                      <div key={asset} className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 h-8 flex items-center justify-center shrink-0 text-xs">
                          {idx + 1}
                        </Badge>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{asset}</span>
                            <span className="text-sm font-mono">{(weight * 100).toFixed(2)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${weight * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Active Positions</p>
                  <p className="text-2xl font-semibold">
                    {Object.values(r.optimal_weights).filter(w => w > 0.01).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Out of {r.n_assets} assets</p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Largest Position</p>
                  <p className="text-2xl font-semibold">
                    {(Math.max(...Object.values(r.optimal_weights)) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Object.entries(r.optimal_weights).sort((a, b) => b[1] - a[1])[0][0]}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Concentration (HHI)</p>
                  <p className="text-2xl font-semibold">
                    {(Object.values(r.optimal_weights).reduce((sum, w) => sum + w * w, 0) * 10000).toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Object.values(r.optimal_weights).reduce((sum, w) => sum + w * w, 0) < 0.2 ? 'Low' : 'Moderate'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visualizations */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
              <TabsList className="mb-4 flex-wrap">
                {visualizations.allocation_pie && <TabsTrigger value="allocation_pie" className="text-xs">Allocation Pie</TabsTrigger>}
                {visualizations.efficient_frontier && <TabsTrigger value="efficient_frontier" className="text-xs">Efficient Frontier</TabsTrigger>}
                {visualizations.correlation_matrix && <TabsTrigger value="correlation_matrix" className="text-xs">Correlation Matrix</TabsTrigger>}
                {visualizations.risk_return_bars && <TabsTrigger value="risk_return_bars" className="text-xs">Risk-Return Profile</TabsTrigger>}
                {visualizations.weights_bar && <TabsTrigger value="weights_bar" className="text-xs">Weights Distribution</TabsTrigger>}
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
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {key === 'allocation_pie' && 'Portfolio allocation showing percentage weight of each asset'}
                      {key === 'efficient_frontier' && 'Efficient frontier curve with optimal portfolio marked (red star)'}
                      {key === 'correlation_matrix' && 'Asset correlation heatmap - diversification benefits from low correlation'}
                      {key === 'risk_return_bars' && 'Individual asset risk and return characteristics'}
                      {key === 'weights_bar' && 'Optimal portfolio weights by asset'}
                    </p>
                  </TabsContent>
                )
              )}
            </Tabs>
          </CardContent>
        </Card>

        {/* Detailed Asset Metrics */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Individual Asset Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Expected Return</TableHead>
                    <TableHead className="text-right">Volatility</TableHead>
                    <TableHead className="text-right">Sharpe Ratio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.asset_metrics.sort((a, b) => b.weight - a.weight).map((asset) => (
                    <TableRow key={asset.asset}>
                      <TableCell className="font-medium">{asset.asset}</TableCell>
                      <TableCell className="text-right font-mono">
                        {(asset.weight * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {(asset.expected_return * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {(asset.volatility * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {asset.sharpe.toFixed(3)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Individual asset metrics calculated from {r.n_periods} historical periods. 
              Portfolio optimization reduces overall risk through strategic diversification.
            </p>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Portfolio Performance Metrics</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground mb-1">Expected Return (Annualized)</p>
                  <p className="text-2xl font-semibold">{(pm.expected_return * 100).toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Historical average return projected forward
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground mb-1">Volatility (Annualized)</p>
                  <p className="text-2xl font-semibold">{(pm.volatility * 100).toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Standard deviation of returns (risk measure)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground mb-1">Sharpe Ratio</p>
                  <p className="text-2xl font-semibold">{pm.sharpe_ratio.toFixed(3)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Risk-adjusted return metric
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground mb-1">Return / Risk Ratio</p>
                  <p className="text-2xl font-semibold">
                    {(pm.expected_return / pm.volatility).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Units of return per unit of risk
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground mb-1">Excess Return</p>
                  <p className="text-2xl font-semibold">
                    {((pm.expected_return - riskFreeRate / 100) * 100).toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Return above risk-free rate
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground mb-1">Optimization Method</p>
                  <p className="text-lg font-semibold">
                    {r.optimization_method.replace('_', ' ').split(' ').map(w => 
                      w.charAt(0).toUpperCase() + w.slice(1)
                    ).join(' ')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.optimization_method === 'max_sharpe' && 'Maximizes risk-adjusted returns'}
                    {r.optimization_method === 'min_variance' && 'Minimizes portfolio volatility'}
                    {r.optimization_method === 'max_return' && 'Maximizes expected returns'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Implementation Guide */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Implementation Recommendations
          </CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Initial Allocation</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Implement target weights gradually over 1-2 weeks to reduce market impact</li>
                  <li>• Consider transaction costs and bid-ask spreads when executing trades</li>
                  <li>• Use limit orders for large positions to minimize slippage</li>
                  <li>• Document initial allocation date for performance tracking</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Rebalancing Strategy</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Review portfolio quarterly for significant weight deviations (±5%)</li>
                  <li>• Rebalance when positions drift beyond tolerance bands</li>
                  <li>• Consider tax implications of rebalancing in taxable accounts</li>
                  <li>• Use cash flows (deposits/withdrawals) for opportunistic rebalancing</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Performance Monitoring</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Track actual returns vs expected returns monthly</li>
                  <li>• Calculate realized Sharpe ratio and compare to target</li>
                  <li>• Monitor portfolio volatility for risk management</li>
                  <li>• Review correlation matrix quarterly for diversification changes</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Annual Review</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Re-optimize annually with updated historical data</li>
                  <li>• Reassess risk tolerance and investment objectives</li>
                  <li>• Update risk-free rate assumptions for current environment</li>
                  <li>• Consider adding or removing assets based on availability</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            Important Disclosures
          </CardTitle></CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <p className="text-sm text-muted-foreground leading-relaxed space-y-2">
                <span className="block">
                  <strong>Historical Performance:</strong> This optimization is based on historical data from {r.n_periods} periods. 
                  Past performance does not guarantee future results. Market conditions, correlations, and returns may change significantly.
                </span>
                <span className="block">
                  <strong>Model Assumptions:</strong> Modern Portfolio Theory assumes returns follow a normal distribution and correlations 
                  remain stable. Real markets exhibit fat tails (extreme events) and time-varying correlations, especially during crises.
                </span>
                <span className="block">
                  <strong>Not Financial Advice:</strong> This analysis is for educational and informational purposes only. It does not 
                  constitute investment advice, financial advice, trading advice, or any other type of advice. Consult qualified financial 
                  professionals before making investment decisions.
                </span>
                <span className="block">
                  <strong>Risk Disclosure:</strong> All investments carry risk, including potential loss of principal. Diversification 
                  does not eliminate risk or ensure profits. Higher expected returns typically involve higher risk and volatility.
                </span>
                <span className="block">
                  <strong>Data Quality:</strong> Results depend on the quality and completeness of input data. Ensure price data is 
                  accurate, properly adjusted for splits and dividends, and represents the assets you intend to trade.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Export Options</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(visualizations).map(([key, value]) =>
                value && (
                  <Button key={key} variant="outline" onClick={() => handleDownloadPNG(key)} className="gap-2">
                    <Download className="w-4 h-4" />
                    {key.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
      
      <PortfolioGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
      
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

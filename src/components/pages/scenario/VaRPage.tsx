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
  ShieldAlert, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Target, BarChart3, Play, Zap, DollarSign, Percent,
  TrendingDown, AlertTriangle, LineChart, PieChart,
  Gauge, Bell, ArrowDownRight, BarChart2, BookOpen, BookMarked
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface AssetVaR {
  asset: string;
  weight: number;
  var_amount: number;
  var_percent: number;
  cvar_amount: number;
  volatility: number;
  contribution_to_var: number;
}

interface VaRResult {
  success: boolean;
  results: {
    portfolio_value: number;
    confidence_level: number;
    time_horizon: number;
    var_parametric: number;
    var_historical: number;
    var_monte_carlo: number;
    cvar_parametric: number;
    cvar_historical: number;
    portfolio_volatility: number;
    portfolio_return: number;
    assets: AssetVaR[];
    var_by_confidence: { confidence: number; var_amount: number }[];
    historical_losses: number[];
    metrics: {
      max_drawdown: number;
      worst_day_loss: number;
      breach_count: number;
      sharpe_ratio: number;
    };
  };
  visualizations: {
    var_comparison?: string;
    distribution_chart?: string;
    historical_var?: string;
    contribution_chart?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    method: string;
    var_amount: number;
    var_percent: number;
    solve_time_ms: number;
  };
}

// ============ CONSTANTS ============
const VAR_METHODS = [
  { value: "parametric", label: "Parametric (Variance-Covariance)", desc: "Assumes normal distribution", icon: BarChart2 },
  { value: "historical", label: "Historical Simulation", desc: "Based on actual historical data", icon: LineChart },
  { value: "monte_carlo", label: "Monte Carlo", desc: "Random simulation approach", icon: Activity },
  { value: "all", label: "Compare All Methods", desc: "Run all three methods", icon: BarChart3 },
];

const CONFIDENCE_LEVELS = [
  { value: 0.90, label: "90%" },
  { value: 0.95, label: "95%" },
  { value: 0.99, label: "99%" },
];

const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  const assets = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
  const startDate = new Date('2023-01-01');
  const days = 252;
  
  const data: DataRow[] = [];
  
  const initialPrices: { [key: string]: number } = {
    'AAPL': 150, 'GOOGL': 100, 'MSFT': 250, 'AMZN': 100, 'TSLA': 200
  };
  
  const params: { [key: string]: { drift: number; vol: number } } = {
    'AAPL': { drift: 0.15, vol: 0.25 },
    'GOOGL': { drift: 0.12, vol: 0.28 },
    'MSFT': { drift: 0.18, vol: 0.22 },
    'AMZN': { drift: 0.10, vol: 0.32 },
    'TSLA': { drift: 0.15, vol: 0.50 },
  };
  
  const prices: { [key: string]: number } = { ...initialPrices };
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const row: DataRow = {
      date: date.toISOString().split('T')[0]
    };
    
    for (const asset of assets) {
      const { drift, vol } = params[asset];
      const dailyDrift = drift / 252;
      const dailyVol = vol / Math.sqrt(252);
      const randomShock = (Math.random() - 0.5) * 2 * 1.5;
      
      prices[asset] = prices[asset] * Math.exp(dailyDrift + dailyVol * randomShock);
      row[asset] = parseFloat(prices[asset].toFixed(2));
    }
    
    data.push(row);
  }
  
  return data;
};

// ============ UTILITY COMPONENTS ============
const MetricCard: React.FC<{ 
  value: string | number; 
  label: string; 
  negative?: boolean; 
  highlight?: boolean; 
  icon?: React.FC<{ className?: string }> 
}> = ({ value, label, negative, highlight, icon: Icon }) => (
  <div className={`text-center p-4 rounded-lg border ${
    negative ? 'border-destructive/30 bg-destructive/5' : 
    highlight ? 'border-primary/30 bg-primary/5' : 
    'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-primary' : negative ? 'text-destructive' : 'text-muted-foreground'}`} />}
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
    a.download = 'var_data.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} rows</Badge>
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
                {columns.slice(0, 7).map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 10).map((row, i) => (
                <TableRow key={i}>
                  {columns.slice(0, 7).map(col => (
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
              Showing first 10 of {data.length} rows
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

const VaRGauge: React.FC<{ 
  value: number; 
  maxValue: number;
  label: string;
  color?: string;
}> = ({ value, maxValue, label, color = '#ef4444' }) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/10">
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">0</span>
        <span className="font-semibold" style={{ color }}>${value.toLocaleString()}</span>
        <span className="text-muted-foreground">${maxValue.toLocaleString()}</span>
      </div>
    </div>
  );
};

const AssetRiskCard: React.FC<{ 
  asset: AssetVaR; 
  index: number;
  maxVar: number;
}> = ({ asset, index, maxVar }) => {
  const color = COLORS[index % COLORS.length];
  const varPercent = (asset.var_amount / maxVar) * 100;
  
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-medium">{asset.asset}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {(asset.weight * 100).toFixed(0)}% weight
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">VaR</span>
            <span className="font-medium text-red-500">${asset.var_amount.toLocaleString()}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full bg-red-500"
              style={{ width: `${varPercent}%` }}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs pt-2">
          <div>
            <p className="text-muted-foreground">Volatility</p>
            <p className="font-medium">{(asset.volatility * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">CVaR</p>
            <p className="font-medium text-red-500">${asset.cvar_amount.toLocaleString()}</p>
          </div>
        </div>
      </div>
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
            <h2 className="text-lg font-semibold">VaR Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Value at Risk (VaR)?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Value at Risk (VaR) is a statistical measure that quantifies the potential loss in portfolio value 
              over a specified time period at a given confidence level. It answers: "What is the maximum loss 
              I can expect with X% confidence over the next N days?" VaR is widely used in risk management 
              and is required for regulatory compliance (Basel III).
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              VaR Calculation Methods
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. Parametric VaR (Variance-Covariance)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Assumption:</strong> Returns follow a normal distribution<br/>
                  <strong>Formula:</strong> VaR = μ - (z × σ × √t) where z = z-score for confidence level<br/>
                  <strong>Pros:</strong> Fast, easy to implement, good for linear portfolios<br/>
                  <strong>Cons:</strong> Underestimates tail risk, assumes normality (real markets have fat tails)<br/>
                  <strong>Best for:</strong> Daily risk monitoring, stable markets, well-diversified portfolios
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. Historical Simulation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Approach:</strong> Use actual historical returns, no distribution assumption<br/>
                  <strong>Method:</strong> Sort historical losses, find percentile (e.g., 5th percentile for 95% VaR)<br/>
                  <strong>Pros:</strong> Captures actual market behavior, no parametric assumptions, includes fat tails<br/>
                  <strong>Cons:</strong> Limited by available history, assumes future will resemble past<br/>
                  <strong>Best for:</strong> Non-normal distributions, when you have sufficient historical data (250+ days)
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. Monte Carlo Simulation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Approach:</strong> Generate thousands of random scenarios based on estimated parameters<br/>
                  <strong>Process:</strong> Simulate returns → Calculate portfolio values → Find percentile<br/>
                  <strong>Pros:</strong> Most flexible, handles complex portfolios, can model various distributions<br/>
                  <strong>Cons:</strong> Computationally intensive, requires distributional assumptions<br/>
                  <strong>Best for:</strong> Complex portfolios (options, derivatives), stress testing, path-dependent products
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Key Concepts
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Confidence Level</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Probability that losses will NOT exceed VaR. Common levels:<br/>
                  • <strong>95%:</strong> Expect to exceed VaR ~13 days per year (1 in 20 days)<br/>
                  • <strong>99%:</strong> Expect to exceed VaR ~2.5 days per year (1 in 100 days)<br/>
                  Higher confidence = higher VaR (more conservative estimate)
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Time Horizon</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Period over which loss is measured. Common horizons:<br/>
                  • <strong>1-day:</strong> Daily trading portfolios, market making<br/>
                  • <strong>10-day:</strong> Regulatory requirement (Basel III)<br/>
                  • <strong>1-month:</strong> Strategic portfolios, pension funds<br/>
                  VaR scales with √time for independent returns (10-day VaR ≈ 1-day VaR × √10)
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">CVaR (Conditional VaR / Expected Shortfall)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Average loss GIVEN that loss exceeds VaR<br/>
                  <strong>Why important:</strong> VaR only tells you the threshold, not how bad it gets beyond that<br/>
                  <strong>Example:</strong> If 95% VaR = $100k and CVaR = $150k, then when you exceed the VaR 
                  threshold, you can expect to lose $150k on average<br/>
                  <strong>Regulatory:</strong> Basel III requires CVaR reporting (more risk-sensitive than VaR)
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Portfolio Volatility (σ)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Standard deviation of portfolio returns. Key driver of VaR.<br/>
                  Annualized volatility = daily vol × √252 (trading days per year)<br/>
                  Low vol (5-10%) = stable; Medium vol (15-25%) = typical stocks; High vol ({'>'}30%) = risky                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Interpreting VaR Results
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Example Interpretation:</strong> "95% VaR of $50,000 for 1 day"</p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>Confidence statement:</strong> "I am 95% confident that I will not lose more than $50,000 tomorrow"</li>
                <li>• <strong>Risk statement:</strong> "There is a 5% chance (1 in 20 days) that I will lose MORE than $50,000"</li>
                <li>• <strong>Expected frequency:</strong> "I expect to see losses exceeding $50,000 about 13 days per year"</li>
              </ul>
              
              <p className="mt-3"><strong>VaR as % of Portfolio:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>{'<'} 2%:</strong> Conservative risk level</li>
                <li>• <strong>2-5%:</strong> Moderate risk level</li>
                <li>• <strong>5-10%:</strong> Aggressive risk level</li>
                <li>• <strong>{'>'} 10%:</strong> Very high risk - consider rebalancing</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              VaR Limitations & Solutions
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Limitation: Doesn't measure tail risk</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> VaR tells you threshold, not magnitude beyond it<br/>
                  <strong>Solution:</strong> Always use CVaR alongside VaR. CVaR captures average loss in worst scenarios.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Limitation: Assumes normal distribution</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Markets have fat tails (extreme events more common than normal predicts)<br/>
                  <strong>Solution:</strong> Use historical or Monte Carlo methods; compare all three approaches
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Limitation: Backward-looking</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Historical data may not predict future crises<br/>
                  <strong>Solution:</strong> Supplement with stress tests (2008 crisis, COVID scenarios)
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Limitation: Not sub-additive</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> VaR(Portfolio A+B) can {'>'} VaR(A) + VaR(B)<br/>
                  <strong>Solution:</strong> CVaR is sub-additive and better for portfolio optimization
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
                  <li>• Minimum 30 days of data (1 year+ recommended)</li>
                  <li>• Daily price data for all assets</li>
                  <li>• Clean data (no gaps, outliers reviewed)</li>
                  <li>• Consider de-trending for long horizons</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Methodology Selection</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use parametric for quick daily checks</li>
                  <li>• Use historical when you have 250+ days data</li>
                  <li>• Use Monte Carlo for options/derivatives</li>
                  <li>• Compare all three methods for validation</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Validation (Backtesting)</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Count VaR breaches over time</li>
                  <li>• 95% VaR should breach ~5% of days</li>
                  <li>• Too many breaches = model underestimates risk</li>
                  <li>• Too few breaches = model is too conservative</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Risk Reporting</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Report VaR at multiple confidence levels (95%, 99%)</li>
                  <li>• Always include CVaR for tail risk</li>
                  <li>• Show VaR trend over time</li>
                  <li>• Include stress test results</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Regulatory Context (Basel III)
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Market Risk Capital:</strong> Banks must hold capital against market risk based on VaR</p>
              
              <p><strong>Requirements:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• 99% confidence level (1% VaR)</li>
                <li>• 10-day holding period</li>
                <li>• 1-year historical observation period (250 days)</li>
                <li>• Daily calculation and monitoring</li>
                <li>• Stressed VaR (during crisis periods)</li>
              </ul>
              
              <p><strong>Capital Requirement:</strong> Capital = max(VaR_t-1, mc × VaR_avg) where mc = multiplication 
              factor (typically 3 or more) to account for model risk</p>
              
              <p><strong>Shift to Expected Shortfall:</strong> Basel III now requires CVaR (Expected Shortfall) 
              instead of VaR for market risk capital, as CVaR better captures tail risk.</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Real-World Applications
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Risk Limits & Budgeting</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Set VaR limits per trader, desk, or portfolio. Allocate risk budget based on VaR contributions. 
                  Example: "No single desk can have VaR {'>'} $10M"
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Portfolio Optimization</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimize portfolio VaR through diversification. Rebalance when individual asset VaR contributions 
                  become too concentrated. CVaR optimization is convex and easier to solve than VaR.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Performance Attribution</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Compare returns to VaR to assess risk-adjusted performance. Sharpe ratio = (Return - RFR) / Volatility. 
                  Information ratio uses tracking error instead of volatility.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Client Reporting</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Translate VaR into language clients understand: "In 95 out of 100 days, your portfolio will not 
                  lose more than X." Show VaR trends and stress scenarios.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Advanced Topics
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Incremental VaR:</strong> Change in portfolio VaR from adding/removing an asset. 
              Useful for portfolio construction and optimization.</p>
              
              <p><strong>Marginal VaR:</strong> Rate of change of VaR with respect to portfolio weight in an asset. 
              ∂VaR/∂w_i. Used for optimal risk allocation.</p>
              
              <p><strong>Component VaR:</strong> Each asset's contribution to portfolio VaR. Sum of component VaRs = Total VaR. 
              Identifies concentration risk.</p>
              
              <p><strong>Cornish-Fisher VaR:</strong> Adjusts for skewness and kurtosis using modified z-scores. 
              Better than parametric for non-normal distributions.</p>
              
              <p><strong>GARCH Models:</strong> Model time-varying volatility for more accurate VaR during volatile periods. 
              GARCH(1,1) is commonly used in practice.</p>
              
              <p><strong>Extreme Value Theory (EVT):</strong> Model tail distribution separately using EVT. 
              Provides better estimates for high confidence levels (99.9%).</p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Remember:</strong> VaR is a risk measure, not a worst-case scenario. 
              It tells you the loss threshold at a confidence level, but losses CAN exceed VaR. Always supplement 
              VaR with stress testing, scenario analysis, and CVaR to get a complete picture of portfolio risk. 
              The 2008 financial crisis showed that extreme events (beyond 99% VaR) DO happen, and can be catastrophic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ============ INTRO PAGE ============
const IntroPage: React.FC<{ 
  method: string;
  setMethod: (method: string) => void;
  onLoadSample: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ method, setMethod, onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      {/* 제목 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <ShieldAlert className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Value at Risk (VaR) Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Quantify potential portfolio losses with a given confidence level.
          Essential for risk management and regulatory compliance.
        </p>
      </div>
      
      {/* 3개 핵심 카드 (선택사항 - 원하면 추가) */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Risk Quantification</p>
              <p className="text-xs text-muted-foreground">Maximum potential loss</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Percent className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Confidence Level</p>
              <p className="text-xs text-muted-foreground">95%, 99% scenarios</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Multiple Methods</p>
              <p className="text-xs text-muted-foreground">Parametric, Historical, MC</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* About VaR Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            About Value at Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">What VaR Tells You</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Maximum expected loss at confidence level",
                  "95% VaR = Loss exceeded 5% of time",
                  "Used for capital allocation",
                  "Regulatory requirement (Basel III)",
                  "Risk budgeting across portfolios",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Required Data</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Date column",
                  "Asset price columns",
                  "Historical data (min 30 days)",
                  "Portfolio weights (optional)",
                  "Portfolio value (optional)",
                ].map((req) => (
                  <li key={req} className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 버튼 */}
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

// ============ MAIN COMPONENT START ============
export default function VaRAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<VaRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  // Configuration
  const [method, setMethod] = useState<string>("parametric");
  const [dateCol, setDateCol] = useState<string>("");
  const [assetCols, setAssetCols] = useState<string[]>([]);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0.95);
  const [timeHorizon, setTimeHorizon] = useState<number>(1);
  const [portfolioValue, setPortfolioValue] = useState<number>(1000000);
  const [numSimulations, setNumSimulations] = useState<number>(10000);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    setDateCol("date");
    setAssetCols(cols.filter(c => c !== 'date'));
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

  const toggleAssetCol = (col: string) => {
    if (assetCols.includes(col)) {
      setAssetCols(assetCols.filter(c => c !== col));
    } else {
      setAssetCols([...assetCols, col]);
    }
  };

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const checks: ValidationCheck[] = [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length} rows loaded` : "No data loaded"
      },
      {
        name: "Date Column",
        passed: !!dateCol,
        message: dateCol ? `Using: ${dateCol}` : "Select date column"
      },
      {
        name: "Asset Columns",
        passed: assetCols.length >= 1,
        message: assetCols.length >= 1 ? `${assetCols.length} assets selected` : "Select at least 1 asset"
      },
      {
        name: "Sufficient Data",
        passed: data.length >= 30,
        message: data.length >= 30 ? `${data.length} data points (OK)` : "Need at least 30 data points"
      },
      {
        name: "Portfolio Value",
        passed: portfolioValue > 0,
        message: portfolioValue > 0 ? `$${portfolioValue.toLocaleString()}` : "Enter portfolio value"
      },
    ];
    
    return checks;
  }, [data, dateCol, assetCols, portfolioValue]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        date_col: dateCol,
        asset_cols: assetCols,
        method: method,
        confidence_level: confidenceLevel,
        time_horizon: timeHorizon,
        portfolio_value: portfolioValue,
        num_simulations: numSimulations,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/var`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: VaRResult = await res.json();
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
    const assets = results.results.assets;
    
    const rows: string[] = ['Asset,Weight,VaR,VaR%,CVaR,Volatility'];
    assets.forEach(a => {
      rows.push(`${a.asset},${(a.weight * 100).toFixed(1)}%,$${a.var_amount.toFixed(0)},${(a.var_percent * 100).toFixed(2)}%,$${a.cvar_amount.toFixed(0)},${(a.volatility * 100).toFixed(1)}%`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'var_analysis.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `var_${chartKey}.png`;
    a.click();
  };


  



  // ============ STEP 2: CONFIG ============
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure VaR Analysis
        </CardTitle>
        <CardDescription>Set up risk analysis parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 👇 VaR Method Selection (새로 추가) */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            VaR Calculation Method
          </h4>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {VAR_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  method === m.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className="w-5 h-5 text-primary" />
                  <p className="font-medium text-sm">
                    {m.label.split(' ')[0]} {/* 짧게 표시 */}
                  </p>
                  {m.value === 'historical' && (
                    <Badge variant="secondary" className="text-xs">Rec</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">{m.desc}</p>
                <p className="text-xs text-muted-foreground">
                  <strong>
                    {m.value === 'parametric' ? 'Fast, assumes normal' :
                     m.value === 'historical' ? 'Actual data, no assumption' :
                     m.value === 'monte_carlo' ? 'Flexible, intensive' :
                     'Compare all methods'}
                  </strong>
                </p>
              </button>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* 👇 Date Column (기존) */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Date Column
          </h4>
          <Select value={dateCol || "__none__"} onValueChange={v => setDateCol(v === "__none__" ? "" : v)}>
            <SelectTrigger className="w-full md:w-1/2">
              <SelectValue placeholder="Select date column..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">-- Select --</SelectItem>
              {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        
        <Separator />
        
        {/* 👇 Asset Columns (기존) */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" />
            Select Assets ({assetCols.length} selected)
          </h4>
          <div className="flex flex-wrap gap-2">
            {columns.filter(c => c !== dateCol).map((col) => (
              <button
                key={col}
                onClick={() => toggleAssetCol(col)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  assetCols.includes(col)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {col}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAssetCols(columns.filter(c => c !== dateCol))}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAssetCols([])}>
              Clear All
            </Button>
          </div>
        </div>
        
        <Separator />
        
        {/* 👇 VaR Parameters (기존) */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            VaR Parameters
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Confidence Level</Label>
              <Select value={String(confidenceLevel)} onValueChange={v => setConfidenceLevel(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONFIDENCE_LEVELS.map(cl => (
                    <SelectItem key={cl.value} value={String(cl.value)}>{cl.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time Horizon (days)</Label>
              <Input 
                type="number" 
                value={timeHorizon} 
                onChange={(e) => setTimeHorizon(Number(e.target.value))}
                min={1}
                max={30}
              />
            </div>
            <div className="space-y-2">
              <Label>Portfolio Value ($)</Label>
              <Input 
                type="number" 
                value={portfolioValue} 
                onChange={(e) => setPortfolioValue(Number(e.target.value))}
                min={0}
              />
            </div>
            {method === 'monte_carlo' && (
              <div className="space-y-2">
                <Label>Simulations</Label>
                <Input 
                  type="number" 
                  value={numSimulations} 
                  onChange={(e) => setNumSimulations(Number(e.target.value))}
                  min={1000}
                  max={100000}
                  step={1000}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* 버튼 */}
        <div className="flex justify-end pt-4">
          <Button onClick={() => setCurrentStep(3)} className="gap-2">
            Continue to Validation
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
  

  // ============ STEP 3: VALIDATION ============
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
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                check.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'
              }`}>
                <div className="flex items-center gap-3">
                  {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
                  <div>
                    <p className="font-medium text-sm">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.message}</p>
                  </div>
                </div>
                <Badge variant={check.passed ? "secondary" : "destructive"} className="text-xs">
                  {check.passed ? "Pass" : "Required"}
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
                  {`Method: ${VAR_METHODS.find(m => m.value === method)?.label} • `}
                  {`${(confidenceLevel * 100).toFixed(0)}% confidence • `}
                  {`${timeHorizon}-day horizon • `}
                  {`${assetCols.length} assets`}
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
            <Button variant="outline" onClick={() => setCurrentStep(2)}>Back to Config</Button>
            <Button onClick={runAnalysis} disabled={loading || !canRun} className="gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Calculate VaR
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
  // ============ STEP 4: SUMMARY ============
  const renderStep4Summary = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights } = results;
    
    const finding = `At ${(r.confidence_level * 100).toFixed(0)}% confidence, the portfolio may lose up to $${summary.var_amount.toLocaleString()} (${(summary.var_percent * 100).toFixed(2)}%) over ${r.time_horizon} day(s). Expected Shortfall (CVaR) is $${r.cvar_parametric.toLocaleString()}.`;

    const maxVar = Math.max(r.var_parametric, r.var_historical, r.var_monte_carlo);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            VaR Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={`$${summary.var_amount.toLocaleString()}`} 
              label={`${(r.confidence_level * 100).toFixed(0)}% VaR`}
              icon={ShieldAlert} 
              negative 
            />
            <MetricCard 
              value={`${(summary.var_percent * 100).toFixed(2)}%`} 
              label="VaR %" 
              icon={Percent}
              negative
            />
            <MetricCard 
              value={`$${r.cvar_parametric.toLocaleString()}`} 
              label="CVaR (ES)" 
              icon={AlertTriangle}
              negative
            />
            <MetricCard 
              value={`${(r.portfolio_volatility * 100).toFixed(1)}%`} 
              label="Portfolio Vol" 
              icon={Activity}
            />
          </div>
          
          {/* VaR by Method Comparison */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              VaR by Method
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              <VaRGauge 
                value={r.var_parametric} 
                maxValue={maxVar * 1.2} 
                label="Parametric VaR"
                color="#3b82f6"
              />
              <VaRGauge 
                value={r.var_historical} 
                maxValue={maxVar * 1.2} 
                label="Historical VaR"
                color="#f59e0b"
              />
              <VaRGauge 
                value={r.var_monte_carlo} 
                maxValue={maxVar * 1.2} 
                label="Monte Carlo VaR"
                color="#8b5cf6"
              />
            </div>
          </div>
          
          {/* VaR by Confidence Level */}
          {r.var_by_confidence && r.var_by_confidence.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" />
                VaR by Confidence Level
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {r.var_by_confidence.map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border text-center ${
                    item.confidence === r.confidence_level ? 'border-primary bg-primary/5' : 'border-border'
                  }`}>
                    <p className="text-xs text-muted-foreground">{(item.confidence * 100).toFixed(0)}% Confidence</p>
                    <p className="text-lg font-semibold text-red-500">${item.var_amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Asset Risk */}
          {r.assets && r.assets.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" />
                Asset Risk Breakdown
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                {r.assets.slice(0, 6).map((asset, idx) => (
                  <AssetRiskCard 
                    key={asset.asset} 
                    asset={asset} 
                    index={idx}
                    maxVar={Math.max(...r.assets.map(a => a.var_amount))}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Additional Metrics */}
          {r.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard 
                value={`${(r.metrics.max_drawdown * 100).toFixed(1)}%`} 
                label="Max Drawdown" 
                negative
              />
              <MetricCard 
                value={`$${r.metrics.worst_day_loss.toLocaleString()}`} 
                label="Worst Day" 
                negative
              />
              <MetricCard 
                value={r.metrics.breach_count} 
                label="VaR Breaches" 
              />
              <MetricCard 
                value={r.metrics.sharpe_ratio.toFixed(2)} 
                label="Sharpe Ratio" 
                highlight={r.metrics.sharpe_ratio > 1}
              />
            </div>
          )}
          
          {/* Key Insights */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
                insight.status === "positive" ? "border-primary/30 bg-primary/5" :
                insight.status === "warning" ? "border-destructive/30 bg-destructive/5" :
                "border-border bg-muted/10"
              }`}>
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
          
          <DetailParagraph
            title="Summary Interpretation"
            detail={`Value at Risk (VaR) measures the potential loss in portfolio value.

■ VaR Results

• Portfolio Value: $${r.portfolio_value.toLocaleString()}
• Confidence Level: ${(r.confidence_level * 100).toFixed(0)}%
• Time Horizon: ${r.time_horizon} day(s)

• Parametric VaR: $${r.var_parametric.toLocaleString()}
• Historical VaR: $${r.var_historical.toLocaleString()}
• Monte Carlo VaR: $${r.var_monte_carlo.toLocaleString()}

■ Interpretation

"With ${(r.confidence_level * 100).toFixed(0)}% confidence, the portfolio will not lose more than $${summary.var_amount.toLocaleString()} over the next ${r.time_horizon} trading day(s)."

Alternatively: "There is a ${((1 - r.confidence_level) * 100).toFixed(0)}% chance of losing MORE than $${summary.var_amount.toLocaleString()}."

■ CVaR (Expected Shortfall)

CVaR of $${r.cvar_parametric.toLocaleString()} indicates the expected loss given that the loss exceeds VaR.
This is the average loss in the worst ${((1 - r.confidence_level) * 100).toFixed(0)}% of scenarios.

■ Risk Level Assessment

${summary.var_percent > 0.05 ?
'⚠️ High risk: VaR exceeds 5% of portfolio value.' :
summary.var_percent > 0.02 ?
'Moderate risk: VaR between 2-5% of portfolio.' :
'✓ Lower risk: VaR below 2% of portfolio.'}`}
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

  // ============ STEP 5: WHY ============
  const renderStep5Why = () => {
    if (!results) return null;
    
    const { results: r } = results;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5 text-primary" />
            Understanding VaR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="VaR quantifies downside risk, but it has limitations. It doesn't tell you how bad losses can get beyond the VaR threshold - that's what CVaR addresses." />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">VaR Methods Explained</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "Parametric VaR", content: "Assumes returns are normally distributed. Uses mean and standard deviation. Fast but may underestimate tail risk." },
                { num: 2, title: "Historical VaR", content: "Uses actual historical returns. No distribution assumption. Limited by available history." },
                { num: 3, title: "Monte Carlo VaR", content: "Simulates thousands of scenarios. Most flexible but computationally intensive." },
                { num: 4, title: "CVaR (Expected Shortfall)", content: "Average loss beyond VaR threshold. Better captures tail risk. Required by Basel III." },
              ].map((exp) => (
                <div key={exp.num} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">{exp.num}</div>
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
          
          {/* Method Comparison */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Method Comparison</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">VaR</TableHead>
                  <TableHead className="text-right">% of Portfolio</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Parametric</TableCell>
                  <TableCell className="text-right text-red-500">${r.var_parametric.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{((r.var_parametric / r.portfolio_value) * 100).toFixed(2)}%</TableCell>
                  <TableCell className="text-xs text-muted-foreground">Assumes normal distribution</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Historical</TableCell>
                  <TableCell className="text-right text-red-500">${r.var_historical.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{((r.var_historical / r.portfolio_value) * 100).toFixed(2)}%</TableCell>
                  <TableCell className="text-xs text-muted-foreground">Based on actual returns</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Monte Carlo</TableCell>
                  <TableCell className="text-right text-red-500">${r.var_monte_carlo.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{((r.var_monte_carlo / r.portfolio_value) * 100).toFixed(2)}%</TableCell>
                  <TableCell className="text-xs text-muted-foreground">Simulation-based</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          <DetailParagraph
            title="Risk Management Recommendations"
            detail={`Based on the VaR analysis, here are risk management recommendations.

■ 1. VaR Limits

Consider setting VaR limits based on risk appetite:
• Conservative: VaR < 2% of portfolio
• Moderate: VaR < 5% of portfolio
• Aggressive: VaR < 10% of portfolio

Current VaR: ${(r.var_parametric / r.portfolio_value * 100).toFixed(2)}% of portfolio

■ 2. Diversification

${r.assets.length > 1 ?
`Portfolio has ${r.assets.length} assets.
${r.assets.some(a => a.weight > 0.4) ?
'⚠️ Concentration risk: Consider rebalancing weights more evenly.' :
'✓ Good diversification across assets.'}` :
'Consider adding more assets to diversify risk.'}

■ 3. Stress Testing

VaR should be supplemented with stress tests:
• Historical scenarios (2008 crisis, COVID crash)
• Hypothetical scenarios (interest rate shock, market crash)
• Sensitivity analysis (factor movements)

■ 4. Backtesting

• Monitor actual losses vs VaR predictions
• Expected breaches at 95%: ~5% of days
• Actual breaches: ${r.metrics?.breach_count || 'N/A'}
${r.metrics?.breach_count && r.metrics.breach_count > data.length * 0.05 * 1.5 ?
'⚠️ More breaches than expected - model may underestimate risk.' : ''}

■ 5. Reporting

Key metrics to report:
• Daily VaR at 95% and 99%
• 10-day VaR (regulatory)
• CVaR for tail risk
• Maximum drawdown`}
          />
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">
              View Full Report
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 6: REPORT ============
  const renderStep6Report = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights, visualizations } = results;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Value at Risk Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {VAR_METHODS.find(m => m.value === method)?.label} | {(r.confidence_level * 100).toFixed(0)}% Confidence | {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={`$${summary.var_amount.toLocaleString()}`} label="VaR" negative />
              <MetricCard value={`${(summary.var_percent * 100).toFixed(2)}%`} label="VaR %" />
              <MetricCard value={`$${r.cvar_parametric.toLocaleString()}`} label="CVaR" />
              <MetricCard value={`${summary.solve_time_ms}ms`} label="Calc Time" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              At {(r.confidence_level * 100).toFixed(0)}% confidence over {r.time_horizon} day(s), 
              the ${r.portfolio_value.toLocaleString()} portfolio may lose up to ${summary.var_amount.toLocaleString()} ({(summary.var_percent * 100).toFixed(2)}%).
              Expected Shortfall is ${r.cvar_parametric.toLocaleString()}.
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
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                ins.status === "warning" ? "border-destructive/30 bg-destructive/5" :
                ins.status === "positive" ? "border-primary/30 bg-primary/5" :
                "border-border bg-muted/10"
              }`}>
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
        
        {/* Visualizations */}
        {visualizations && Object.keys(visualizations).some(k => visualizations[k as keyof typeof visualizations]) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Visualizations</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
                <TabsList className="mb-4 flex-wrap">
                  {visualizations.var_comparison && <TabsTrigger value="var_comparison" className="text-xs">Method Comparison</TabsTrigger>}
                  {visualizations.distribution_chart && <TabsTrigger value="distribution_chart" className="text-xs">Distribution</TabsTrigger>}
                  {visualizations.historical_var && <TabsTrigger value="historical_var" className="text-xs">Historical</TabsTrigger>}
                  {visualizations.contribution_chart && <TabsTrigger value="contribution_chart" className="text-xs">Contribution</TabsTrigger>}
                </TabsList>
                {Object.entries(visualizations).map(([key, value]) => value && (
                  <TabsContent key={key} value={key}>
                    <div className="relative border border-border rounded-lg overflow-hidden">
                      <img src={`data:image/png;base64,${value}`} alt={key} className="w-full" />
                      <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(key)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}
        
        {/* Asset Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Asset Risk Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">VaR</TableHead>
                  <TableHead className="text-right">CVaR</TableHead>
                  <TableHead className="text-right">Volatility</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.assets.map((a, idx) => (
                  <TableRow key={a.asset}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="font-medium">{a.asset}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{(a.weight * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right text-red-500">${a.var_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-500">${a.cvar_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{(a.volatility * 100).toFixed(1)}%</TableCell>
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
                CSV (Assets)
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

  // ============ RENDER ============
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
      
      <StatisticalGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />  {/* 👈 이 줄 추가 */}
      
      {currentStep > 1 && (
        <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />
      )}
      
      {currentStep > 1 && data.length > 0 && (
        <DataPreview data={data} columns={columns} />
      )}
      
      {currentStep === 1 && (
        <IntroPage 
          method={method}
          setMethod={setMethod}
          onLoadSample={handleLoadSample} 
          onFileUpload={handleFileUpload} 
        />
      )}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}
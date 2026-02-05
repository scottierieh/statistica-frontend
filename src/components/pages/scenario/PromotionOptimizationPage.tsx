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
  ChevronRight, DollarSign, Users, Target, Zap,
  Sparkles, AlertTriangle, BookMarked, Percent, TrendingDown
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface Strategy {
  strategy: string;
  customers_targeted: number;
  cost: number;
  conversions: number;
  revenue: number;
  roi: number;
  profit: number;
}

interface PromotionResult {
  success: boolean;
  results: {
    metrics: {
      total_customers: number;
      promoted_customers: number;
      control_customers: number;
      promo_conversion_rate: number;
      control_conversion_rate: number;
      uplift: number;
      uplift_percentage: number;
      p_value: number;
      is_significant: boolean;
      promo_total_revenue?: number;
      control_total_revenue?: number;
      promo_avg_revenue?: number;
      control_avg_revenue?: number;
      revenue_uplift?: number;
    };
    strategies: Strategy[];
    customer_sample: Array<any>;
    feature_importance: string[];
  };
  visualizations: {
    conversion_comparison?: string;
    uplift_distribution?: string;
    customer_segmentation?: string;
    strategy_comparison?: string;
    statistical_significance?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    total_customers: number;
    uplift_percentage: number;
    is_significant: boolean;
    best_strategy: string;
  };
}

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const numCustomers = 1000;
  
  for (let i = 0; i < numCustomers; i++) {
    const age = 18 + Math.floor(Math.random() * 62);
    const recency_days = Math.floor(Math.random() * 365);
    const frequency = Math.floor(Math.random() * 20);
    const avg_order = 20 + Math.random() * 200;
    
    const received_promotion = Math.random() > 0.5 ? 1 : 0;
    
    let base_prob = 0.1 + (frequency / 100) + (1 - recency_days / 365) * 0.1;
    
    let uplift = 0;
    if (received_promotion === 1) {
      if (age < 35 && frequency > 5) {
        uplift = 0.15;
      } else if (frequency > 2) {
        uplift = 0.08;
      } else if (recency_days < 30) {
        uplift = 0.02;
      } else {
        uplift = -0.05;
      }
    }
    
    const conversion_prob = Math.min(0.95, Math.max(0.01, base_prob + uplift));
    const converted = Math.random() < conversion_prob ? 1 : 0;
    const revenue = converted === 1 ? avg_order * (0.8 + Math.random() * 0.4) : 0;
    
    data.push({
      customer_id: `CUST_${String(i + 1).padStart(4, '0')}`,
      age,
      recency_days,
      frequency,
      avg_order_value: parseFloat(avg_order.toFixed(2)),
      received_promotion,
      converted,
      revenue: parseFloat(revenue.toFixed(2))
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
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return val;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'promotion_source_data.csv';
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
            <h2 className="text-lg font-semibold">Promotion Optimization Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Uplift Modeling?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Uplift modeling measures the incremental impact of marketing actions by comparing outcomes between 
              treatment and control groups. Unlike traditional predictive models that estimate overall conversion 
              probability, uplift models specifically quantify the causal effect of an intervention (like a promotion) 
              on customer behavior.
            </p>
            <div className="p-3 rounded-lg border border-border bg-muted/10">
              <p className="text-sm font-medium mb-2">Key Difference from Traditional ML</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• <strong>Traditional Model:</strong> "Who will convert?" → Predicts P(conversion)</p>
                <p>• <strong>Uplift Model:</strong> "Who will convert BECAUSE of promotion?" → Predicts ΔP(conversion)</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Two-Model Approach
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. Treatment Model</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Training Data:</strong> Only customers who received promotion<br/>
                  <strong>Algorithm:</strong> Random Forest Classifier (100 trees, max depth 5)<br/>
                  <strong>Input Features:</strong> Customer attributes (age, recency, frequency, etc.)<br/>
                  <strong>Output:</strong> P(conversion | received promotion, features)
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. Control Model</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Training Data:</strong> Only customers in control group<br/>
                  <strong>Algorithm:</strong> Random Forest Classifier (100 trees, max depth 5)<br/>
                  <strong>Input Features:</strong> Same customer attributes<br/>
                  <strong>Output:</strong> P(conversion | no promotion, features)
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. Uplift Calculation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Formula:</strong> Uplift(customer) = P_treatment(customer) - P_control(customer)<br/>
                  <strong>Interpretation:</strong> Incremental conversion probability from promotion<br/>
                  <strong>Range:</strong> -1 to +1 (negative = promotion hurts conversion)<br/>
                  <strong>Example:</strong> If P_treatment = 0.25 and P_control = 0.15, Uplift = +0.10 (10pp increase)
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
            <p className="text-sm text-muted-foreground mb-3">
              Based on uplift scores, customers are divided into four strategic segments using quartiles:
            </p>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border-2 border-green-500/30 bg-green-500/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">Sure Things (Top 25%)</p>
                  <Badge variant="default" className="bg-green-600">High Uplift</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Highest uplift scores (e.g., +0.15 to +0.30). These customers respond very positively to promotions.
                </p>
                <div className="text-xs">
                  <p className="font-medium mb-1">Characteristics:</p>
                  <ul className="text-muted-foreground space-y-0.5">
                    <li>• Young, frequent buyers who love deals</li>
                    <li>• Actively seeking promotions before purchase</li>
                    <li>• Price-sensitive but high lifetime value</li>
                  </ul>
                  <p className="font-medium mt-2 mb-1">Strategy: Always Target</p>
                  <p className="text-muted-foreground">Maximum ROI. Include in all campaigns. Consider premium/exclusive offers.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border-2 border-blue-500/30 bg-blue-500/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">Persuadables (25-50%)</p>
                  <Badge variant="default" className="bg-blue-600">Medium Uplift</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Medium uplift scores (e.g., +0.05 to +0.15). Can be influenced by promotions.
                </p>
                <div className="text-xs">
                  <p className="font-medium mb-1">Characteristics:</p>
                  <ul className="text-muted-foreground space-y-0.5">
                    <li>• Regular customers with moderate engagement</li>
                    <li>• Respond to well-timed, relevant offers</li>
                    <li>• Need nudge to convert</li>
                  </ul>
                  <p className="font-medium mt-2 mb-1">Strategy: Standard Targeting</p>
                  <p className="text-muted-foreground">Good ROI. Include in standard campaigns. Test different promotion types.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border-2 border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">Sleeping Dogs (50-75%)</p>
                  <Badge variant="default" className="bg-yellow-600">Low Uplift</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Low but positive uplift (e.g., +0.01 to +0.05). Minimal response to promotions.
                </p>
                <div className="text-xs">
                  <p className="font-medium mb-1">Characteristics:</p>
                  <ul className="text-muted-foreground space-y-0.5">
                    <li>• Will convert anyway without promotion</li>
                    <li>• Promotion doesn't significantly change behavior</li>
                    <li>• Value-focused rather than deal-focused</li>
                  </ul>
                  <p className="font-medium mt-2 mb-1">Strategy: Selective Targeting</p>
                  <p className="text-muted-foreground">Low ROI. Include only if budget allows. May waste marketing spend.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border-2 border-red-500/30 bg-red-500/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">Lost Causes (Bottom 25%)</p>
                  <Badge variant="destructive">Negative Uplift</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Negative uplift (e.g., -0.10 to 0). Promotions actually decrease conversion likelihood.
                </p>
                <div className="text-xs">
                  <p className="font-medium mb-1">Characteristics:</p>
                  <ul className="text-muted-foreground space-y-0.5">
                    <li>• See promotions as sign of desperation/low quality</li>
                    <li>• Prefer full-price to maintain perceived value</li>
                    <li>• May be annoyed by excessive marketing</li>
                  </ul>
                  <p className="font-medium mt-2 mb-1">Strategy: Do Not Target</p>
                  <p className="text-muted-foreground">Negative ROI. Exclude completely. Promotions harm conversion and brand.</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              ROI Optimization
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">ROI Calculation Formula</p>
                <div className="text-xs text-muted-foreground space-y-1 font-mono bg-muted/30 p-2 rounded">
                  <p>ROI = (Revenue - Cost) / Cost</p>
                  <p>Revenue = Σ(conversions × avg_order_value)</p>
                  <p>Cost = num_promotions × cost_per_promotion</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Strategy Comparison</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="font-medium min-w-[140px]">Current (Baseline):</span>
                    <span>Your existing promotion strategy. Benchmark for comparison.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium min-w-[140px]">Top 50% Uplift:</span>
                    <span>Target upper half by uplift score. Balanced reach and efficiency.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium min-w-[140px]">Top 25% Uplift:</span>
                    <span>Target highest quartile only. Usually best ROI but lower reach.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium min-w-[140px]">Positive Uplift:</span>
                    <span>Exclude all negative uplift customers. Prevents waste and harm.</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm mb-2">Example Optimization Impact</p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between p-1.5 bg-muted/30 rounded">
                    <span>Current Strategy:</span>
                    <span className="font-semibold">500 customers, $500 cost, 2.5x ROI</span>
                  </div>
                  <div className="flex justify-between p-1.5 bg-primary/10 rounded">
                    <span>Top 25% Uplift:</span>
                    <span className="font-semibold text-primary">125 customers, $125 cost, 4.1x ROI</span>
                  </div>
                  <div className="flex justify-between p-1.5 bg-muted/10 rounded text-xs">
                    <span>Impact:</span>
                    <span>+64% ROI, -$375 cost, same profit with 75% less waste</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Statistical Significance Testing
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Chi-square test determines if observed conversion differences are statistically meaningful or due to chance.
              </p>
              
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Interpreting P-values</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <div className="p-2 rounded bg-green-500/10 border border-green-500/30">
                    <p className="font-medium">p {'<'} 0.05 (Significant ✓)</p>
                    <p>Less than 5% chance results are due to random variation. Effect is real and actionable.</p>
                  </div>
                  <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                    <p className="font-medium">0.05 ≤ p {'<'} 0.10 (Borderline)</p>
                    <p>Suggestive but not conclusive. Consider collecting more data before major decisions.</p>
                  </div>
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/30">
                    <p className="font-medium">p ≥ 0.10 (Not Significant ✗)</p>
                    <p>Cannot rule out chance. Need larger sample or longer test period.</p>
                  </div>
                </div>
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
              <div className="p-2 rounded border border-border bg-muted/10">
                <p className="font-medium text-foreground">✓ Required Assumptions</p>
                <ul className="text-xs space-y-1 mt-1">
                  <li>• <strong>Random Assignment:</strong> Treatment/control must be randomly assigned (no selection bias)</li>
                  <li>• <strong>SUTVA:</strong> No interference between customers (one person's treatment doesn't affect another)</li>
                  <li>• <strong>Stability:</strong> Customer behavior patterns remain relatively stable over analysis period</li>
                  <li>• <strong>Representative Sample:</strong> Test population represents broader customer base</li>
                </ul>
              </div>

              <div className="p-2 rounded border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-foreground">✗ Known Limitations</p>
                <ul className="text-xs space-y-1 mt-1">
                  <li>• <strong>No External Factors:</strong> Doesn't account for seasonality, competitors, market changes</li>
                  <li>• <strong>Short-term Focus:</strong> Measures immediate conversion, not long-term brand impact</li>
                  <li>• <strong>Historical Data:</strong> Based on past behavior; future may differ</li>
                  <li>• <strong>Feature Limitation:</strong> Quality depends on available customer attributes</li>
                  <li>• <strong>A/B Test Required:</strong> Needs proper control group; can't evaluate without one</li>
                </ul>
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
                  <li>✓ Minimum 100 customers (50 per group)</li>
                  <li>✓ 200+ customers ideal for stability</li>
                  <li>✓ Random treatment assignment</li>
                  <li>✓ Clean conversion tracking</li>
                  <li>✓ Binary outcome variables (0/1)</li>
                  <li>✓ Sufficient promotion history</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Implementation Steps</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>1. Start with pilot test (10-20%)</li>
                  <li>2. Validate uplift predictions</li>
                  <li>3. Compare predicted vs actual ROI</li>
                  <li>4. A/B test optimization strategies</li>
                  <li>5. Gradually scale winning approach</li>
                  <li>6. Re-run analysis quarterly</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Strategy Selection</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Balance reach vs efficiency</li>
                  <li>• Consider budget constraints</li>
                  <li>• Test multiple strategies in parallel</li>
                  <li>• Always exclude negative uplift</li>
                  <li>• Focus on profit, not just ROI</li>
                  <li>• Monitor long-term effects</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Validation Checklist</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>□ Statistical significance (p {'<'} 0.05)</li>
                  <li>□ Verified random assignment</li>
                  <li>□ Predicted vs actual uplift match</li>
                  <li>□ Segment stability over time</li>
                  <li>□ No data leakage or bias</li>
                  <li>□ ROI improvement validated</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Important Note:</strong> Uplift modeling provides probabilistic estimates 
              of promotion effectiveness based on historical A/B test data. Results depend on proper experimental design, 
              randomization, data quality, and market stability. Always validate recommendations through controlled experiments 
              before full deployment. This analysis supports decision-making but does not guarantee specific outcomes. 
              Consider working with a data scientist or statistician for mission-critical campaigns.
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
        <h1 className="text-2xl font-semibold">Promotion Optimization & Uplift Modeling</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Analyze promotion effectiveness using uplift modeling and causal inference. Identify which customers 
          benefit from promotions, optimize targeting strategies, and maximize marketing ROI.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Uplift Modeling</p>
              <p className="text-xs text-muted-foreground">Causal impact</p>
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
              <p className="text-xs text-muted-foreground">Optimal targeting</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">ROI Optimization</p>
              <p className="text-xs text-muted-foreground">Maximize returns</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use Promotion Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Promotion indicator (1=promoted, 0=control)",
                  "Conversion outcome (1=converted, 0=not)",
                  "Revenue column (optional)",
                  "At least 100 customers (50 per group)",
                  "A/B test or randomized promotion data"
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
                  "Incremental conversion uplift measurement",
                  "Customer segmentation by response",
                  "ROI calculation and optimization",
                  "Targeting strategy recommendations",
                  "Statistical significance testing"
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
export default function PromotionOptimizationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<PromotionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const [promotionCol, setPromotionCol] = useState<string>("");
  const [conversionCol, setConversionCol] = useState<string>("");
  const [revenueCol, setRevenueCol] = useState<string>("");
  const [costPerPromotion, setCostPerPromotion] = useState<number>(1);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setPromotionCol("received_promotion");
    setConversionCol("converted");
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
    const promotedCount = data.filter(d => d[promotionCol] == 1).length;
    const controlCount = data.filter(d => d[promotionCol] == 0).length;
    
    const promotionValues = new Set(data.map(d => d[promotionCol]));
    const conversionValues = new Set(data.map(d => d[conversionCol]));
    
    const isPromotionBinary = promotionValues.size === 2 && 
      Array.from(promotionValues).every(v => v === 0 || v === 1 || v === '0' || v === '1');
    const isConversionBinary = conversionValues.size === 2 && 
      Array.from(conversionValues).every(v => v === 0 || v === 1 || v === '0' || v === '1');
    
    const checks: ValidationCheck[] = [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 
          ? `${data.length.toLocaleString()} observations loaded` 
          : "No data loaded"
      },
      {
        name: "Promotion Column",
        passed: !!promotionCol,
        message: promotionCol ? `Using: ${promotionCol}` : "Select promotion column"
      },
      {
        name: "Conversion Column",
        passed: !!conversionCol,
        message: conversionCol ? `Using: ${conversionCol}` : "Select conversion column"
      },
      {
        name: "Binary Promotion Column",
        passed: isPromotionBinary,
        message: isPromotionBinary ? "Valid binary column (0/1)" : "Must be binary (0=control, 1=promoted)"
      },
      {
        name: "Binary Conversion Column",
        passed: isConversionBinary,
        message: isConversionBinary ? "Valid binary column (0/1)" : "Must be binary (0=no, 1=yes)"
      },
      {
        name: "Sufficient Sample Size",
        passed: data.length >= 100,
        message: data.length >= 200 ? `${data.length} observations (excellent)` : data.length >= 100 ? `${data.length} observations (acceptable)` : `Only ${data.length} observations (need ≥100)`
      },
      {
        name: "Treatment Group Size",
        passed: promotedCount >= 50,
        message: promotedCount >= 100 ? `${promotedCount} promoted (excellent)` : promotedCount >= 50 ? `${promotedCount} promoted (acceptable)` : `Only ${promotedCount} promoted (need ≥50)`
      },
      {
        name: "Control Group Size",
        passed: controlCount >= 50,
        message: controlCount >= 100 ? `${controlCount} control (excellent)` : controlCount >= 50 ? `${controlCount} control (acceptable)` : `Only ${controlCount} control (need ≥50)`
      }
    ];
    
    return checks;
  }, [data, promotionCol, conversionCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        promotion_col: promotionCol,
        conversion_col: conversionCol,
        revenue_col: revenueCol || null,
        cost_per_promotion: costPerPromotion
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/promotion-optimization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: PromotionResult = await res.json();
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
    a.download = `promotion_${chartKey}.png`;
    a.click();
  };

  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Promotion Analysis
        </CardTitle>
        <CardDescription>Set up uplift modeling parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Required Columns
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Promotion Column *</Label>
              <Select value={promotionCol || "__none__"} onValueChange={v => setPromotionCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">1=promoted, 0=control</p>
            </div>

            <div className="space-y-2">
              <Label>Conversion Column *</Label>
              <Select value={conversionCol || "__none__"} onValueChange={v => setConversionCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">1=converted, 0=not</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Optional Parameters
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Revenue Column (Optional)</Label>
              <Select value={revenueCol || "__none__"} onValueChange={v => setRevenueCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- None --</SelectItem>
                  {columns.filter(col => {
                    const sample = data[0]?.[col];
                    return typeof sample === "number" || !isNaN(Number(sample));
                  }).map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cost per Promotion ($)</Label>
              <Input
                type="number"
                value={costPerPromotion}
                onChange={(e) => setCostPerPromotion(Math.max(0.01, parseFloat(e.target.value) || 1))}
                min={0.01}
                step={0.01}
              />
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

  const renderStep4Summary = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights } = results;
    const metrics = r.metrics;
    const strategies = r.strategies;
    
    const finding = `Analysis of ${summary.total_customers} customers reveals ${summary.uplift_percentage > 0 ? '+' : ''}${summary.uplift_percentage.toFixed(1)}% uplift in conversion rate from promotions. ${summary.is_significant ? 'This effect is statistically significant (p=' + metrics.p_value.toFixed(4) + ').' : 'Effect not statistically significant (p=' + metrics.p_value.toFixed(4) + ').'} Best strategy: ${summary.best_strategy}.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Promotion Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={summary.total_customers} label="Total Customers" icon={Users} highlight />
            <MetricCard value={`${summary.uplift_percentage > 0 ? '+' : ''}${summary.uplift_percentage.toFixed(1)}%`} label="Uplift" icon={summary.uplift_percentage > 0 ? TrendingUp : TrendingDown} />
            <MetricCard value={summary.is_significant ? "Yes" : "No"} label="Significant" icon={summary.is_significant ? CheckCircle2 : AlertCircle} />
            <MetricCard value={`${(metrics.promo_conversion_rate * 100).toFixed(1)}%`} label="Promo Conv Rate" icon={Percent} />
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Conversion Rates Comparison</h4>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded-lg p-4 border border-border bg-muted/10">
                <Zap className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-medium">Promoted Group</p>
                <p className="text-2xl font-semibold">{(metrics.promo_conversion_rate * 100).toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.promoted_customers.toLocaleString()} customers promoted
                </p>
              </div>

              <div className="rounded-lg p-4 border border-border bg-muted/10">
                <Users className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-medium">Control Group</p>
                <p className="text-2xl font-semibold">{(metrics.control_conversion_rate * 100).toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.control_customers.toLocaleString()} customers in control
                </p>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-sm">
                <strong>Incremental Uplift:</strong> {metrics.uplift > 0 ? '+' : ''}{(metrics.uplift * 100).toFixed(2)} percentage points
                {metrics.promo_total_revenue && (
                  <span> | <strong>Revenue Uplift:</strong> ${((metrics.promo_avg_revenue || 0) - (metrics.control_avg_revenue || 0)).toFixed(2)} per customer</span>
                )}
              </p>
            </div>
          </div>

          {strategies && strategies.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Strategy Comparison</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Strategy</TableHead>
                      <TableHead className="text-right">Customers</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Conversions</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {strategies.map((strategy, idx) => (
                      <TableRow 
                        key={idx} 
                        className={strategy.strategy === summary.best_strategy ? 'bg-primary/10 font-medium' : idx === 0 ? 'bg-muted/20' : ''}
                      >
                        <TableCell>
                          {strategy.strategy}
                          {strategy.strategy === summary.best_strategy && (
                            <Badge variant="default" className="ml-2 text-xs">Best ROI</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{strategy.customers_targeted.toLocaleString()}</TableCell>
                        <TableCell className="text-right">${strategy.cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{strategy.conversions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">${strategy.revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={strategy.roi > strategies[0].roi ? 'text-primary' : ''}>
                            {strategy.roi.toFixed(2)}x
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          ${strategy.profit.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {strategies.length > 1 && (
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-sm">
                    <strong>Optimization Opportunity:</strong> {' '}
                    {strategies.find(s => s.strategy === summary.best_strategy) && strategies[0] && (
                      <>
                        Switching to "{summary.best_strategy}" improves ROI from {strategies[0].roi.toFixed(2)}x to{' '}
                        {strategies.find(s => s.strategy === summary.best_strategy)!.roi.toFixed(2)}x
                        {' '}(+{(((strategies.find(s => s.strategy === summary.best_strategy)!.roi - strategies[0].roi) / strategies[0].roi) * 100).toFixed(1)}%)
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

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
                 insight.status === "warning" ? <AlertTriangle className="w-5 h-5 text-destructive shrink-0" /> :
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
            detail={`This promotion optimization analysis evaluates the incremental impact of marketing promotions on ${summary.total_customers.toLocaleString()} customers using uplift modeling.

■ Uplift Effect: ${summary.uplift_percentage > 0 ? '+' : ''}${summary.uplift_percentage.toFixed(1)}%
${summary.uplift_percentage > 0 
  ? `Promotions increase conversion rates by ${summary.uplift_percentage.toFixed(1)}%, from ${(metrics.control_conversion_rate * 100).toFixed(2)}% (control) to ${(metrics.promo_conversion_rate * 100).toFixed(2)}% (promoted). This represents an incremental lift of ${(metrics.uplift * 100).toFixed(2)} percentage points directly attributable to the promotion.`
  : `Promotions decrease conversion rates by ${Math.abs(summary.uplift_percentage).toFixed(1)}%. This negative uplift suggests promotions may be cannibalizing organic conversions or causing adverse customer reactions. Consider redesigning the promotion or improving targeting.`}

■ Statistical Significance: ${summary.is_significant ? 'Significant ✓' : 'Not Significant ✗'}
${summary.is_significant
  ? `P-value of ${metrics.p_value.toFixed(4)} indicates the observed difference is statistically significant at the 95% confidence level (p < 0.05). The promotion effect is unlikely due to random chance and represents a real causal impact.`
  : `P-value of ${metrics.p_value.toFixed(4)} suggests the observed difference could be due to random variation rather than true promotion effect. Either the sample size is insufficient to detect effects, or the promotion has minimal real impact. Consider running a larger test or improving the promotion.`}

■ Strategy Optimization
${strategies && strategies.length > 1
  ? `Analysis compares ${strategies.length} targeting strategies. Best performer: "${summary.best_strategy}" with ROI of ${strategies.find(s => s.strategy === summary.best_strategy)?.roi.toFixed(2)}x. This strategy targets ${strategies.find(s => s.strategy === summary.best_strategy)?.customers_targeted.toLocaleString()} customers, reducing costs while maintaining or improving profitability. Focus promotions on high-uplift customers to maximize returns while reducing wasted spend on low or negative responders.`
  : 'Current strategy analyzed. Consider implementing uplift-based targeting for optimization opportunities.'}

■ Actionable Recommendations
Based on uplift segmentation, prioritize customers with positive uplift scores for future campaigns. ${summary.is_significant && summary.uplift_percentage > 0 ? 'Expand successful promotion to high-response segments.' : 'Re-evaluate promotion design and targeting before scaling.'} Test optimized strategies through controlled experiments before full deployment to validate ROI improvements.`}
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

  const renderStep5Methodology = () => {
    if (!results) return null;

    const explanations = [
      {
        num: 1,
        title: "Two-Model Approach",
        content: "Trains separate Random Forest models on treatment and control groups. Treatment model learns P(conversion|promoted), control model learns P(conversion|no promotion). The difference between these predictions is each customer's uplift score.",
        details: "This method avoids class imbalance issues and captures heterogeneous treatment effects better than single-model approaches."
      },
      {
        num: 2,
        title: "Uplift Calculation",
        content: "For each customer, predict conversion probability under both scenarios: (1) if promoted, (2) if not promoted. Uplift = P(promoted) - P(not promoted). Positive uplift means promotion increases conversion.",
        details: "Example: Customer A has P(promoted)=0.40, P(control)=0.15 → Uplift=+0.25 (25pp increase). Customer B has P(promoted)=0.20, P(control)=0.30 → Uplift=-0.10 (promotion hurts)."
      },
      {
        num: 3,
        title: "Customer Segmentation",
        content: "Rank all customers by uplift score. Divide into quartiles: Sure Things (top 25%), Persuadables (25-50%), Sleeping Dogs (50-75%), Lost Causes (bottom 25%). Each segment requires different strategy.",
        details: "Segmentation enables targeted campaigns: focus budget on high-uplift customers while excluding those with negative uplift."
      },
      {
        num: 4,
        title: "Statistical Testing",
        content: "Chi-square test compares conversion rates between promoted and control groups. P-value < 0.05 means difference is statistically significant, not due to random chance.",
        details: "Statistical significance validates that observed uplift represents real causal effect, justifying investment in promotion campaigns."
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
          <FindingBox finding="Uplift modeling uses machine learning to identify customers most likely to respond positively to promotions, enabling targeted campaigns that maximize ROI while minimizing wasted spend and preventing negative customer reactions." />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Analysis Components</h4>
            <div className="space-y-4">
              {explanations.map((exp) => (
                <div key={exp.num} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                      {exp.num}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">{exp.title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                        {exp.content}
                      </p>
                      <div className="p-2 rounded bg-muted/30 border border-border">
                        <p className="text-xs text-muted-foreground">
                          <strong>Why it matters:</strong> {exp.details}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Technical Details</h4>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Algorithm
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• <strong>Model:</strong> Random Forest Classifier</p>
                  <p>• <strong>Trees:</strong> 100 estimators</p>
                  <p>• <strong>Max Depth:</strong> 5 levels</p>
                  <p>• <strong>Features:</strong> Customer attributes (RFM, demographics)</p>
                  <p>• <strong>Output:</strong> Probability scores (0-1)</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Statistical Test
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• <strong>Test:</strong> Chi-square test</p>
                  <p>• <strong>Null Hypothesis:</strong> No difference in conversion rates</p>
                  <p>• <strong>Significance:</strong> α = 0.05 (95% confidence)</p>
                  <p>• <strong>P-value:</strong> Probability results are due to chance</p>
                  <p>• <strong>Reject H0:</strong> If p {'<'} 0.05</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Targeting Strategy Framework</h4>
            <div className="space-y-3">
              {[
                {
                  segment: "Sure Things",
                  color: "green",
                  strategy: "Always Target",
                  tactics: ["Priority targeting", "Premium offers", "Loyalty rewards", "Early access"],
                  goal: "Highest uplift customers. Maximum incremental impact. Always include in campaigns.",
                  example: "Young frequent buyers (age < 35, frequency > 5). Promotion increases conversion from 20% to 35% (+15pp)."
                },
                {
                  segment: "Persuadables",
                  color: "blue",
                  strategy: "Standard Targeting",
                  tactics: ["Regular promotions", "Seasonal campaigns", "Discount codes", "Bundle offers"],
                  goal: "Medium uplift customers. Good ROI expected. Include in standard campaigns.",
                  example: "Regular customers (frequency > 2). Promotion increases conversion from 12% to 20% (+8pp)."
                },
                {
                  segment: "Sleeping Dogs",
                  color: "yellow",
                  strategy: "Selective Targeting",
                  tactics: ["Budget permitting", "Low-cost channels", "Organic content", "Minimal outreach"],
                  goal: "Low uplift customers. Include only if budget allows. May not justify costs.",
                  example: "Recent buyers (recency < 30 days). Promotion barely moves conversion from 18% to 20% (+2pp)."
                },
                {
                  segment: "Lost Causes",
                  color: "red",
                  strategy: "Do Not Target",
                  tactics: ["Exclude completely", "Focus on organic", "No promotions", "Alternative engagement"],
                  goal: "Negative uplift customers. Promotions decrease conversion. Avoid completely.",
                  example: "Lapsed customers (recency > 300 days). Promotion reduces conversion from 15% to 10% (-5pp)."
                }
              ].map((item, idx) => (
                <div key={idx} className={`p-4 rounded-lg border-2 border-${item.color}-500/30 bg-${item.color}-500/5`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{item.segment}</p>
                    <Badge variant={item.color === "red" ? "destructive" : "default"} className={`bg-${item.color}-600`}>
                      {item.strategy}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{item.goal}</p>
                  <div className="mb-2">
                    <p className="text-xs font-medium mb-1">Recommended Tactics:</p>
                    <div className="flex flex-wrap gap-1">
                      {item.tactics.map(tactic => (
                        <Badge key={tactic} variant="outline" className="text-xs">
                          {tactic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground">
                      <strong>Example:</strong> {item.example}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <DetailParagraph
            title="Implementation Roadmap"
            detail={`Step-by-step guide for implementing uplift-based promotion optimization in your organization.

■ Phase 1: Data Collection & Analysis (Week 1-2)
• Ensure proper A/B test setup with random assignment (50/50 split recommended)
• Verify minimum 100 customers (50 per group) but aim for 200+ for stability
• Collect customer features: age, recency, frequency, monetary value, engagement metrics
• Run initial uplift analysis to identify segments and calculate baseline ROI
• Document current promotion costs and conversion rates for benchmarking

■ Phase 2: Pilot Testing (Week 3-4)
• Select top 10-20% customers by uplift score for controlled pilot
• Launch targeted campaign to pilot group while maintaining control group
• Track conversions, revenue, and costs meticulously
• Calculate actual uplift: (pilot conversion rate) - (control conversion rate)
• Compare predicted vs actual uplift to validate model accuracy (should be within ±5pp)
• Measure ROI improvement over baseline to quantify business impact

■ Phase 3: Strategy Optimization (Week 5-6)
• Compare multiple targeting strategies: Top 25%, Top 50%, Positive Only
• Calculate ROI for each approach: (Revenue - Cost) / Cost
• Evaluate trade-offs: reach vs efficiency, profit vs ROI
• Select optimal balance based on business objectives and constraints
• Prepare detailed rollout plan with success metrics and monitoring dashboards
• Get stakeholder buy-in by presenting pilot results and projected impact

■ Phase 4: Full Deployment (Week 7-8)
• Roll out optimized targeting strategy to broader customer base
• Exclude negative uplift customers completely (Lost Causes segment)
• Monitor real-time performance: conversion rates, ROI, customer feedback
• Track cost savings from reduced wasted spend (targeting fewer customers)
• Measure revenue gains from improved conversion in targeted segments
• Document lessons learned and optimization opportunities

■ Ongoing: Monitoring & Refinement (Quarterly)
• Re-run uplift analysis every 3 months as customer behavior evolves
• Update segment assignments as customers move between segments
• A/B test new promotion formats, messaging, and channels
• Continuously optimize targeting rules based on latest data
• Monitor model drift: compare predicted vs actual uplift over time
• Expand feature set with new data sources for better predictions

■ Key Success Metrics to Track
• Uplift Model Accuracy: Predicted vs actual uplift correlation (target: r > 0.7)
• ROI Improvement: New ROI / Baseline ROI (target: +30-50% improvement)
• Cost Efficiency: Cost savings from reduced targeting (track absolute $ saved)
• Conversion Lift: Increase in conversion rate for targeted segments (track pp change)
• Customer Satisfaction: NPS or CSAT scores (ensure promotions don't harm brand)
• Long-term Impact: Customer lifetime value, retention, repeat purchase rate

■ Common Pitfalls to Avoid
• Ignoring Randomization: Non-random assignment creates selection bias, invalidating results. Always use proper A/B testing with random splits.
• Over-targeting: Excluding too many customers limits reach. Balance efficiency with market coverage. Don't chase perfect ROI at expense of scale.
• Ignoring Negative Uplift: Never promote to Lost Causes segment. Wasting money and potentially damaging brand perception.
• Static Segments: Customer behavior changes over time. Re-analyze quarterly to keep segments current and accurate.
• Short-term Focus: Consider long-term brand impact and customer lifetime value, not just immediate conversion uplift.
• Insufficient Sample Size: With < 100 customers, results unreliable. Wait for more data before making major strategic decisions.
• No Validation: Always validate uplift predictions through pilot tests before full rollout. Models can be wrong.`}
          />

          <Card className="border-border bg-muted/10">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm mb-2">Disclaimer</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This analysis provides probabilistic estimates of promotion effectiveness based on A/B test data using 
                    machine learning (Two-Model Random Forest approach). Results assume proper randomization, stable market 
                    conditions, no interference between customers (SUTVA), and representative sampling. Uplift predictions 
                    are decision-support tools and should be validated through controlled experiments before full deployment. 
                    Actual results may vary based on execution quality, external factors (seasonality, competition, economic 
                    conditions), promotional context, and changes in customer behavior. Always start with small pilots and 
                    scale gradually based on validated results. Consider consulting with data scientists or statisticians 
                    for mission-critical campaigns with significant budget implications.
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

  const renderStep6Report = () => {
    if (!results) return null;

    const { summary, results: r, key_insights, visualizations } = results;
    const strategies = r.strategies;
    const metrics = r.metrics;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Promotion Optimization Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Uplift Modeling & ROI Analysis | {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <MetricCard value={summary.total_customers.toLocaleString()} label="Total Customers" highlight />
              <MetricCard value={`${summary.uplift_percentage > 0 ? '+' : ''}${summary.uplift_percentage.toFixed(1)}%`} label="Uplift" />
              <MetricCard value={summary.is_significant ? "Yes" : "No"} label="Significant" />
              <MetricCard value={metrics.p_value.toFixed(4)} label="P-value" />
              <MetricCard value={strategies[0]?.roi.toFixed(2) + 'x' || 'N/A'} label="Current ROI" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Promotion uplift analysis conducted on {summary.total_customers.toLocaleString()} customers 
              ({metrics.promoted_customers.toLocaleString()} promoted, {metrics.control_customers.toLocaleString()} control). 
              Observed {summary.uplift_percentage > 0 ? '+' : ''}{summary.uplift_percentage.toFixed(1)}% change in conversion rate from 
              {(metrics.control_conversion_rate * 100).toFixed(2)}% to {(metrics.promo_conversion_rate * 100).toFixed(2)}%. 
              Effect is {summary.is_significant ? 'statistically significant' : 'not statistically significant'} (p={metrics.p_value.toFixed(4)}). 
              {strategies.length > 1 && ` Optimal strategy: "${summary.best_strategy}" with ${strategies.find(s => s.strategy === summary.best_strategy)?.roi.toFixed(2)}x ROI.`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Conversion Analysis</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20">
                    <span className="text-sm">Promoted Conversion Rate</span>
                    <span className="font-semibold">{(metrics.promo_conversion_rate * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-muted/20">
                    <span className="text-sm">Control Conversion Rate</span>
                    <span className="font-semibold">{(metrics.control_conversion_rate * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-primary/10 border border-primary/30">
                    <span className="text-sm font-medium">Absolute Uplift</span>
                    <span className="font-semibold text-primary">
                      {metrics.uplift > 0 ? '+' : ''}{(metrics.uplift * 100).toFixed(2)} pp
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-primary/10 border border-primary/30">
                    <span className="text-sm font-medium">Relative Uplift</span>
                    <span className="font-semibold text-primary">
                      {summary.uplift_percentage > 0 ? '+' : ''}{summary.uplift_percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {metrics.promo_total_revenue && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Revenue Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 rounded bg-muted/20">
                      <span className="text-sm">Promoted Avg Revenue</span>
                      <span className="font-semibold">${(metrics.promo_avg_revenue || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-muted/20">
                      <span className="text-sm">Control Avg Revenue</span>
                      <span className="font-semibold">${(metrics.control_avg_revenue || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-primary/10 border border-primary/30">
                      <span className="text-sm font-medium">Revenue Uplift</span>
                      <span className="font-semibold text-primary">
                        ${((metrics.promo_avg_revenue || 0) - (metrics.control_avg_revenue || 0)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-muted/20">
                      <span className="text-sm">Total Promo Revenue</span>
                      <span className="font-semibold">${(metrics.promo_total_revenue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Visualizations</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
              <TabsList className="mb-4 flex-wrap">
                {visualizations.conversion_comparison && <TabsTrigger value="conversion_comparison" className="text-xs">Conversion</TabsTrigger>}
                {visualizations.uplift_distribution && <TabsTrigger value="uplift_distribution" className="text-xs">Uplift Dist</TabsTrigger>}
                {visualizations.customer_segmentation && <TabsTrigger value="customer_segmentation" className="text-xs">Segmentation</TabsTrigger>}
                {visualizations.strategy_comparison && <TabsTrigger value="strategy_comparison" className="text-xs">Strategies</TabsTrigger>}
                {visualizations.statistical_significance && <TabsTrigger value="statistical_significance" className="text-xs">Significance</TabsTrigger>}
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

        {strategies && strategies.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Strategy Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Strategy</TableHead>
                    <TableHead className="text-right">Targeted</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {strategies.map((s, idx) => (
                    <TableRow key={idx} className={s.strategy === summary.best_strategy ? 'bg-primary/5 font-medium' : ''}>
                      <TableCell>
                        {s.strategy}
                        {s.strategy === summary.best_strategy && (
                          <Badge variant="default" className="ml-2 text-xs">Best</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{s.customers_targeted.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${s.cost.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{s.conversions.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${s.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">{s.roi.toFixed(2)}x</TableCell>
                      <TableCell className="text-right font-semibold text-primary">${s.profit.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {strategies.length > 1 && (
                <div className="mt-4 p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="text-sm font-medium mb-2">Optimization Impact</p>
                  <div className="grid md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">ROI Improvement</p>
                      <p className="font-semibold">
                        {strategies[0] && strategies.find(s => s.strategy === summary.best_strategy) && 
                          `+${(((strategies.find(s => s.strategy === summary.best_strategy)!.roi - strategies[0].roi) / strategies[0].roi) * 100).toFixed(1)}%`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost Savings</p>
                      <p className="font-semibold">
                        {strategies[0] && strategies.find(s => s.strategy === summary.best_strategy) && 
                          `$${(strategies[0].cost - strategies.find(s => s.strategy === summary.best_strategy)!.cost).toLocaleString()}`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Efficiency Gain</p>
                      <p className="font-semibold">
                        {strategies[0] && strategies.find(s => s.strategy === summary.best_strategy) && 
                          `${((1 - strategies.find(s => s.strategy === summary.best_strategy)!.customers_targeted / strategies[0].customers_targeted) * 100).toFixed(0)}% fewer targets`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Immediate Actions</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {summary.is_significant && summary.uplift_percentage > 0 ? (
                    <>
                      <li>• Implement {summary.best_strategy} targeting strategy</li>
                      <li>• Focus promotions on high-uplift customer segments</li>
                      <li>• Exclude negative uplift customers to reduce waste</li>
                    </>
                  ) : summary.is_significant && summary.uplift_percentage < 0 ? (
                    <>
                      <li>• Suspend current promotion immediately</li>
                      <li>• Redesign promotion to address negative response</li>
                      <li>• Test alternative promotion formats with small pilot</li>
                    </>
                  ) : (
                    <>
                      <li>• Increase sample size to improve statistical power</li>
                      <li>• Run promotion for longer duration to collect more data</li>
                      <li>• Consider redesigning promotion for clearer effects</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Long-term Strategy</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Re-run uplift analysis quarterly as customer behavior evolves</li>
                  <li>• A/B test optimized strategies before full deployment</li>
                  <li>• Monitor actual vs predicted uplift to validate model accuracy</li>
                  <li>• Build customer profiles for each uplift segment</li>
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
                This report provides probabilistic estimates of promotion effectiveness based on A/B test data using uplift modeling techniques. 
                Uplift predictions are decision-support tools derived from statistical algorithms (Two-Model Random Forest approach) and should be 
                validated through controlled experiments before full deployment. Results assume proper randomization between treatment and control 
                groups, no interference between customers (SUTVA), and stable market conditions. Actual results may vary based on execution quality, 
                external market factors, and promotional context. The final responsibility for any business decisions rests solely with the user.
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
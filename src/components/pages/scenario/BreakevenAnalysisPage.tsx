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
  Calculator, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Target, BarChart3, Play, Zap, DollarSign, Percent, AlertTriangle,
  TrendingDown, Scale, Package, LineChart, PieChart,
  ArrowUpRight, ArrowDownRight, Minus, Hash,
  BookOpen, BookMarked 
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface ProductBreakeven {
  product: string;
  fixed_cost: number;
  variable_cost: number;
  selling_price: number;
  contribution_margin: number;
  contribution_margin_ratio: number;
  breakeven_units: number;
  breakeven_revenue: number;
  current_units?: number;
  current_profit?: number;
  margin_of_safety?: number;
}

interface SensitivityPoint {
  variable: string;
  change_percent: number;
  new_breakeven: number;
  change_from_base: number;
}

interface BreakevenResult {
  success: boolean;
  results: {
    products: ProductBreakeven[];
    total_fixed_cost: number;
    weighted_avg_cm_ratio: number;
    overall_breakeven_revenue: number;
    sensitivity_analysis: SensitivityPoint[];
    scenarios: {
      name: string;
      breakeven_units: number;
      breakeven_revenue: number;
      profit_at_target: number;
    }[];
    metrics: {
      avg_contribution_margin: number;
      total_breakeven_units: number;
      days_to_breakeven?: number;
    };
  };
  visualizations: {
    breakeven_chart?: string;
    contribution_chart?: string;
    sensitivity_chart?: string;
    profit_volume_chart?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    breakeven_units: number;
    breakeven_revenue: number;
    solve_time_ms: number;
  };
}

// ============ CONSTANTS ============
const ANALYSIS_TYPES = [
  { value: "single", label: "Single Product", desc: "One product break-even analysis", icon: Package },
  { value: "multi", label: "Multi Product", desc: "Multiple products with sales mix", icon: PieChart },
  { value: "target", label: "Target Profit", desc: "Units needed for target profit", icon: Target },
];

const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  return [
    { product: 'Product A', fixed_cost: 50000, variable_cost: 25, selling_price: 50, sales_mix: 0.4, current_units: 3000 },
    { product: 'Product B', fixed_cost: 30000, variable_cost: 40, selling_price: 80, sales_mix: 0.35, current_units: 1500 },
    { product: 'Product C', fixed_cost: 20000, variable_cost: 15, selling_price: 35, sales_mix: 0.25, current_units: 2500 },
  ];
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
    a.download = 'breakeven_data.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} products</Badge>
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
                {columns.map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
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

const ProductCard: React.FC<{ 
  product: ProductBreakeven; 
  index: number;
}> = ({ product, index }) => {
  const color = COLORS[index % COLORS.length];
  const isProfitable = product.current_profit && product.current_profit > 0;
  const hasMarginOfSafety = product.margin_of_safety && product.margin_of_safety > 0;
  
  return (
    <div className={`p-4 rounded-lg border ${
      isProfitable ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-muted/10'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-medium">{product.product}</span>
        </div>
        {isProfitable ? (
          <Badge variant="outline" className="text-xs text-green-600">Profitable</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-amber-600">Below BE</Badge>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <p className="text-muted-foreground text-xs">Break-even Units</p>
          <p className="font-semibold">{product.breakeven_units.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Break-even Revenue</p>
          <p className="font-semibold">${product.breakeven_revenue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Contribution Margin</p>
          <p className="font-semibold">${product.contribution_margin.toFixed(2)}/unit</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">CM Ratio</p>
          <p className="font-semibold">{(product.contribution_margin_ratio * 100).toFixed(1)}%</p>
        </div>
      </div>
      
      {product.current_units && (
        <div className="pt-3 border-t border-border">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Current: {product.current_units.toLocaleString()} units</span>
            {hasMarginOfSafety && (
              <span className="text-green-600">Safety: {(product.margin_of_safety! * 100).toFixed(0)}%</span>
            )}
          </div>
          {product.current_profit !== undefined && (
            <p className={`text-sm font-medium mt-1 ${product.current_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.current_profit >= 0 ? 'Profit' : 'Loss'}: ${Math.abs(product.current_profit).toLocaleString()}
            </p>
          )}
        </div>
      )}
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
            <h2 className="text-lg font-semibold">Break-even Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Break-even Analysis?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Break-even analysis determines the point where total revenue equals total costs (both fixed and variable). 
              It answers: "How many units must I sell to cover all my expenses?" Below this point you lose money; 
              above it you make profit. This is fundamental for pricing, cost management, and business planning.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Core Formulas
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. Contribution Margin (CM)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Formula:</strong> CM = Selling Price - Variable Cost per Unit<br/>
                  <strong>Example:</strong> Product sells for $50, variable cost is $30 → CM = $20<br/>
                  <strong>Meaning:</strong> Each unit sold contributes $20 toward covering fixed costs and profit<br/>
                  <strong>Why important:</strong> Higher CM = fewer units needed to break even
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. Contribution Margin Ratio (CM Ratio)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Formula:</strong> CM Ratio = Contribution Margin / Selling Price<br/>
                  <strong>Example:</strong> CM $20, Price $50 → CM Ratio = 40%<br/>
                  <strong>Meaning:</strong> 40 cents of every sales dollar goes toward fixed costs and profit<br/>
                  <strong>Benchmark:</strong> 20-30% = low, 30-50% = moderate, 50%+ = high margin business
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. Break-even Point (Units)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Formula:</strong> BE Units = Fixed Costs / Contribution Margin per Unit<br/>
                  <strong>Example:</strong> Fixed costs $100,000, CM $20 → BE = 5,000 units<br/>
                  <strong>Meaning:</strong> Must sell 5,000 units to cover all costs<br/>
                  <strong>At BE point:</strong> Total Revenue = Total Costs, Profit = $0
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">4. Break-even Point (Revenue)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Formula:</strong> BE Revenue = Fixed Costs / CM Ratio<br/>
                  <strong>Example:</strong> Fixed costs $100,000, CM Ratio 40% → BE = $250,000<br/>
                  <strong>Alternative:</strong> BE Units × Selling Price = 5,000 × $50 = $250,000<br/>
                  <strong>Use case:</strong> Easier when you track revenue rather than units
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">5. Target Profit Analysis</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Formula:</strong> Units for Target Profit = (Fixed Costs + Target Profit) / CM per Unit<br/>
                  <strong>Example:</strong> Want $50,000 profit → (100,000 + 50,000) / 20 = 7,500 units<br/>
                  <strong>Meaning:</strong> Need to sell 7,500 units to earn $50,000 profit<br/>
                  <strong>Application:</strong> Set sales targets based on profit goals
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">6. Margin of Safety</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Formula:</strong> Margin of Safety = (Actual Sales - BE Sales) / Actual Sales<br/>
                  <strong>Example:</strong> Selling 7,000 units, BE 5,000 → (7,000 - 5,000) / 7,000 = 28.6%<br/>
                  <strong>Meaning:</strong> Sales can drop 28.6% before you start losing money<br/>
                  <strong>Interpretation:</strong> below 10% = risky, 10-30% = moderate, above 30% = safe
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Fixed vs Variable Costs
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-2">Fixed Costs</p>
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Definition:</strong> Costs that remain constant regardless of production volume
                </p>
                <p className="text-xs text-muted-foreground"><strong>Examples:</strong></p>
                <ul className="text-xs text-muted-foreground ml-4 mt-1 space-y-1">
                  <li>• Rent and lease payments</li>
                  <li>• Salaries (salaried employees)</li>
                  <li>• Insurance premiums</li>
                  <li>• Depreciation</li>
                  <li>• Property taxes</li>
                  <li>• Software licenses</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Note:</strong> Fixed costs are "fixed" only within relevant range. Eventually change with major volume shifts.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-2">Variable Costs</p>
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Definition:</strong> Costs that change proportionally with production volume
                </p>
                <p className="text-xs text-muted-foreground"><strong>Examples:</strong></p>
                <ul className="text-xs text-muted-foreground ml-4 mt-1 space-y-1">
                  <li>• Direct materials</li>
                  <li>• Direct labor (hourly)</li>
                  <li>• Sales commissions</li>
                  <li>• Packaging materials</li>
                  <li>• Shipping costs</li>
                  <li>• Transaction fees</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Key:</strong> Per-unit variable cost stays constant, but total variable cost increases with volume.
                </p>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <p className="text-xs font-medium text-amber-600 mb-1">Semi-Variable (Mixed) Costs</p>
              <p className="text-xs text-muted-foreground">
                Some costs have both fixed and variable components (e.g., utilities, maintenance). 
                Split these into fixed and variable portions for accurate analysis.
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Multi-Product Break-even
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Challenge:</strong> When selling multiple products with different margins, which break-even do you use?</p>
              
              <p className="mt-2"><strong>Solution: Sales Mix Analysis</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>Sales Mix:</strong> Proportion of each product in total sales (e.g., 40% Product A, 35% B, 25% C)</li>
                <li>• <strong>Weighted Average CM:</strong> (CM_A × Mix_A) + (CM_B × Mix_B) + (CM_C × Mix_C)</li>
                <li>• <strong>Overall BE Units:</strong> Total Fixed Costs / Weighted Average CM</li>
                <li>• <strong>Per Product BE:</strong> Overall BE Units × Each Product's Sales Mix %</li>
              </ul>
              
              <p className="mt-2"><strong>Example:</strong></p>
              <div className="p-2 rounded bg-muted/50 font-mono text-xs mt-1">
                Product A: $20 CM, 40% mix → $8 weighted<br/>
                Product B: $30 CM, 35% mix → $10.50 weighted<br/>
                Product C: $15 CM, 25% mix → $3.75 weighted<br/>
                Weighted Avg CM: $22.25<br/>
                <br/>
                Fixed Costs: $100,000<br/>
                Overall BE: 100,000 / 22.25 = 4,494 units total<br/>
                Product A BE: 4,494 × 40% = 1,798 units<br/>
                Product B BE: 4,494 × 35% = 1,573 units<br/>
                Product C BE: 4,494 × 25% = 1,124 units
              </div>
              
              <p className="mt-2 text-amber-600"><strong>Important:</strong> This assumes sales mix stays constant. If mix changes significantly, recalculate break-even.</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <LineChart className="w-4 h-4" />
              Sensitivity Analysis
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Purpose:</strong> Understand how changes in key variables affect break-even point</p>
              
              <p className="mt-2"><strong>Key Relationships:</strong></p>
              <div className="grid md:grid-cols-2 gap-2">
                <div className="p-2 rounded-lg border border-border bg-muted/5">
                  <p className="font-medium text-xs mb-1">If Fixed Costs Increase</p>
                  <p className="text-xs">→ Break-even point INCREASES (need more sales)</p>
                </div>
                <div className="p-2 rounded-lg border border-border bg-muted/5">
                  <p className="font-medium text-xs mb-1">If Variable Costs Increase</p>
                  <p className="text-xs">→ CM decreases → BE INCREASES (worse margins)</p>
                </div>
                <div className="p-2 rounded-lg border border-border bg-muted/5">
                  <p className="font-medium text-xs mb-1">If Selling Price Increases</p>
                  <p className="text-xs">→ CM increases → BE DECREASES (better margins)</p>
                </div>
                <div className="p-2 rounded-lg border border-border bg-muted/5">
                  <p className="font-medium text-xs mb-1">If Sales Mix Shifts</p>
                  <p className="text-xs">→ BE changes based on whether shifting to higher or lower margin products</p>
                </div>
              </div>
              
              <p className="mt-3"><strong>Common Scenarios to Test:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• ±10% change in selling price</li>
                <li>• ±20% change in variable costs (material price changes)</li>
                <li>• ±10% change in fixed costs (rent increase/decrease)</li>
                <li>• Sales mix shifting 10% toward highest/lowest margin product</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Practical Applications
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">1. Pricing Decisions</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use break-even to determine minimum viable price. If competitor pricing forces you below break-even price, 
                  you must reduce costs or exit market. Calculate: Minimum Price = (Fixed Costs / Expected Volume) + Variable Cost
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">2. Make vs Buy Decisions</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Should you make in-house (high fixed, low variable) or outsource (low fixed, high variable)? 
                  Calculate break-even volume where costs equal. Below that volume: outsource. Above: make in-house.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">3. Sales Target Setting</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Set realistic sales targets by starting from desired profit, working backward through break-even formula. 
                  Example: Want $100K profit, CM $25/unit → (Fixed + Profit) / CM = sales target.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">4. Cost Reduction Priorities</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Calculate impact of reducing each cost type. $1 reduction in fixed costs = same impact at any volume. 
                  $1 reduction in variable cost = impact multiplies by volume (bigger benefit at high volumes).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">5. New Product Launch</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Before launching, calculate break-even to determine if market size is sufficient. 
                  If market is only 2,000 units but break-even is 5,000 → not viable without major cost reduction.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Common Pitfalls & Limitations
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Assumption: Linearity</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Issue:</strong> Assumes costs and revenues are perfectly linear (not true in reality)<br/>
                  <strong>Reality:</strong> Bulk discounts, overtime premiums, economies of scale exist<br/>
                  <strong>Solution:</strong> Use break-even for relevant range only, recalculate for major volume changes
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Assumption: Constant Mix</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Issue:</strong> Multi-product analysis assumes sales mix never changes<br/>
                  <strong>Reality:</strong> Customer preferences shift, promotions affect mix<br/>
                  <strong>Solution:</strong> Monitor actual mix monthly, update analysis quarterly
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Assumption: All Units Sell</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Issue:</strong> Assumes all production sells (no inventory buildup)<br/>
                  <strong>Reality:</strong> Unsold inventory ties up cash, may become obsolete<br/>
                  <strong>Solution:</strong> Consider inventory carrying costs, use cash break-even for tight cash situations
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Time Value of Money</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Issue:</strong> Ignores when revenues and costs occur<br/>
                  <strong>Reality:</strong> $1 today worth more than $1 next year<br/>
                  <strong>Solution:</strong> For multi-year analysis, use NPV instead of simple break-even
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
                <p className="font-medium text-sm text-primary mb-1">Data Accuracy</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use actual accounting data, not estimates</li>
                  <li>• Properly classify mixed costs</li>
                  <li>• Update cost data quarterly</li>
                  <li>• Verify variable cost per unit with production</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Regular Monitoring</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Calculate break-even monthly</li>
                  <li>• Track actual sales vs break-even</li>
                  <li>• Monitor margin of safety trends</li>
                  <li>• Alert if safety margin falls below 15%</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Scenario Planning</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Prepare best/worst/most likely scenarios</li>
                  <li>• Test impact of major cost/price changes</li>
                  <li>• Model different sales mix scenarios</li>
                  <li>• Identify break-even for new initiatives</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Decision Making</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Don't rely on break-even alone</li>
                  <li>• Consider cash flow and ROI</li>
                  <li>• Factor in strategic goals</li>
                  <li>• Use as input, not sole decision criteria</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Advanced Concepts
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>1. Operating Leverage</strong></p>
              <p className="text-xs ml-4">
                <strong>Definition:</strong> Degree of Operating Leverage (DOL) = Contribution Margin / Operating Income<br/>
                <strong>Meaning:</strong> % change in operating income for 1% change in sales<br/>
                <strong>Example:</strong> DOL of 3 means 10% sales increase → 30% profit increase<br/>
                <strong>Trade-off:</strong> High fixed costs = high leverage = high risk but high reward potential
              </p>
              
              <p className="mt-3"><strong>2. Cash Break-even</strong></p>
              <p className="text-xs ml-4">
                <strong>Formula:</strong> (Fixed Costs - Non-Cash Expenses) / CM per Unit<br/>
                <strong>Purpose:</strong> Units needed to cover cash outlays (excludes depreciation)<br/>
                <strong>Use case:</strong> Startups or cash-constrained businesses<br/>
                <strong>Note:</strong> Always lower than accounting break-even
              </p>
              
              <p className="mt-3"><strong>3. Multi-Period Analysis</strong></p>
              <p className="text-xs ml-4">
                When do you recover initial investment? Use cumulative break-even:<br/>
                • Year 1: Track if above break-even<br/>
                • Year 2: Add cumulative profit to track total<br/>
                • Payback occurs when cumulative profit = initial investment
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Remember:</strong> Break-even analysis is a planning tool, not a prediction. 
              It shows what MUST happen to avoid losses, not what WILL happen. Use it alongside cash flow analysis, 
              market research, and strategic planning. The goal isn't just to break even—it's to build a healthy margin 
              of safety and achieve your profit targets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ============ INTRO PAGE ============
const IntroPage: React.FC<{ 
  analysisType: string;
  setAnalysisType: (type: string) => void;
  onLoadSample: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ analysisType, setAnalysisType, onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      {/* 제목 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Calculator className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Break-even Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Calculate the point where total revenue equals total costs.
          Understand how many units you need to sell to cover all expenses.
        </p>
      </div>
      
      {/* ❌ Analysis Type 선택 카드 삭제 */}
      
      {/* 3개 핵심 카드 추가 */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Break-even Point</p>
              <p className="text-xs text-muted-foreground">Units & revenue</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Percent className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Contribution Margin</p>
              <p className="text-xs text-muted-foreground">Per unit & ratio</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <LineChart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Sensitivity Analysis</p>
              <p className="text-xs text-muted-foreground">What-if scenarios</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            About Break-even Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Key Formulas</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "BE Units = Fixed Costs / CM per Unit",
                  "CM = Selling Price - Variable Cost",
                  "CM Ratio = CM / Selling Price",
                  "BE Revenue = Fixed Costs / CM Ratio",
                  "Margin of Safety = (Sales - BE) / Sales",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Calculator className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Required Data</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Fixed costs (rent, salaries, etc.)",
                  "Variable cost per unit",
                  "Selling price per unit",
                  "Sales mix (for multi-product)",
                  "Current sales (optional)",
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
export default function BreakevenAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<BreakevenResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);  // 👈 이 줄 추가

  
  // Configuration
  const [analysisType, setAnalysisType] = useState<string>("single");
  const [productCol, setProductCol] = useState<string>("");
  const [fixedCostCol, setFixedCostCol] = useState<string>("");
  const [variableCostCol, setVariableCostCol] = useState<string>("");
  const [sellingPriceCol, setSellingPriceCol] = useState<string>("");
  const [salesMixCol, setSalesMixCol] = useState<string>("");
  const [currentUnitsCol, setCurrentUnitsCol] = useState<string>("");
  const [targetProfit, setTargetProfit] = useState<number>(0);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    setProductCol("product");
    setFixedCostCol("fixed_cost");
    setVariableCostCol("variable_cost");
    setSellingPriceCol("selling_price");
    setSalesMixCol("sales_mix");
    setCurrentUnitsCol("current_units");
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
    const checks: ValidationCheck[] = [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length} products loaded` : "No data loaded"
      },
      {
        name: "Fixed Cost Column",
        passed: !!fixedCostCol,
        message: fixedCostCol ? `Using: ${fixedCostCol}` : "Select fixed cost column"
      },
      {
        name: "Variable Cost Column",
        passed: !!variableCostCol,
        message: variableCostCol ? `Using: ${variableCostCol}` : "Select variable cost column"
      },
      {
        name: "Selling Price Column",
        passed: !!sellingPriceCol,
        message: sellingPriceCol ? `Using: ${sellingPriceCol}` : "Select selling price column"
      },
    ];
    
    if (analysisType === 'multi' && data.length > 1) {
      checks.push({
        name: "Sales Mix Column",
        passed: !!salesMixCol,
        message: salesMixCol ? `Using: ${salesMixCol}` : "Required for multi-product"
      });
    }
    
    return checks;
  }, [data, fixedCostCol, variableCostCol, sellingPriceCol, salesMixCol, analysisType]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        product_col: productCol || null,
        fixed_cost_col: fixedCostCol,
        variable_cost_col: variableCostCol,
        selling_price_col: sellingPriceCol,
        sales_mix_col: salesMixCol || null,
        current_units_col: currentUnitsCol || null,
        target_profit: targetProfit,
        analysis_type: analysisType,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/breakeven`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: BreakevenResult = await res.json();
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
    const products = results.results.products;
    
    const rows: string[] = ['Product,Fixed Cost,Variable Cost,Selling Price,CM,CM Ratio,BE Units,BE Revenue'];
    products.forEach(p => {
      rows.push(`${p.product},${p.fixed_cost},${p.variable_cost},${p.selling_price},${p.contribution_margin.toFixed(2)},${(p.contribution_margin_ratio * 100).toFixed(1)}%,${p.breakeven_units},${p.breakeven_revenue}`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'breakeven_analysis.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `breakeven_${chartKey}.png`;
    a.click();
  };

  // ============ STEP 2: CONFIG ============
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Analysis
        </CardTitle>
        <CardDescription>Set up break-even parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Analysis Type 선택 - 3개로 조정 */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Analysis Type
          </h4>
          <div className="grid md:grid-cols-3 gap-3">
            {ANALYSIS_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setAnalysisType(type.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  analysisType === type.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <type.icon className="w-5 h-5 text-primary" />
                  <p className="font-medium text-sm">{type.label}</p>
                  {type.value === 'single' && (
                    <Badge variant="secondary" className="text-xs">Basic</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{type.desc}</p>
              </button>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Required Columns */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Required Columns
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            {data.length > 1 && (
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Select value={productCol || "__none__"} onValueChange={v => setProductCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Optional --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Fixed Cost *</Label>
              <Select value={fixedCostCol || "__none__"} onValueChange={v => setFixedCostCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Variable Cost per Unit *</Label>
              <Select value={variableCostCol || "__none__"} onValueChange={v => setVariableCostCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Selling Price per Unit *</Label>
              <Select value={sellingPriceCol || "__none__"} onValueChange={v => setSellingPriceCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
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
            {analysisType === 'multi' && data.length > 1 && (
              <div className="space-y-2">
                <Label>Sales Mix (% or ratio)</Label>
                <Select value={salesMixCol || "__none__"} onValueChange={v => setSalesMixCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Optional --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Current Sales (units)</Label>
              <Select value={currentUnitsCol || "__none__"} onValueChange={v => setCurrentUnitsCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Optional --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {analysisType === 'target' && (
              <div className="space-y-2">
                <Label>Target Profit ($)</Label>
                <Input 
                  type="number" 
                  value={targetProfit} 
                  onChange={(e) => setTargetProfit(Number(e.target.value))}
                  min={0}
                />
              </div>
            )}
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
                  {`Analysis: ${ANALYSIS_TYPES.find(t => t.value === analysisType)?.label} • `}
                  {`${data.length} product(s)`}
                  {targetProfit > 0 && ` • Target: $${targetProfit.toLocaleString()}`}
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
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Analysis
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
    
    const finding = `Break-even point: ${summary.breakeven_units.toLocaleString()} units or $${summary.breakeven_revenue.toLocaleString()} in revenue. Average contribution margin ratio: ${(r.weighted_avg_cm_ratio * 100).toFixed(1)}%. Total fixed costs: $${r.total_fixed_cost.toLocaleString()}.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Break-even Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={summary.breakeven_units.toLocaleString()} 
              label="Break-even Units" 
              icon={Hash} 
              highlight 
            />
            <MetricCard 
              value={`$${summary.breakeven_revenue.toLocaleString()}`} 
              label="Break-even Revenue" 
              icon={DollarSign}
              highlight
            />
            <MetricCard 
              value={`$${r.total_fixed_cost.toLocaleString()}`} 
              label="Total Fixed Cost" 
              icon={TrendingDown}
            />
            <MetricCard 
              value={`${(r.weighted_avg_cm_ratio * 100).toFixed(1)}%`} 
              label="Avg CM Ratio" 
              icon={Percent}
            />
          </div>
          
          {r.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard 
                value={`$${r.metrics.avg_contribution_margin.toFixed(2)}`} 
                label="Avg CM per Unit" 
              />
              <MetricCard 
                value={r.metrics.total_breakeven_units.toLocaleString()} 
                label="Total BE Units" 
              />
              {r.metrics.days_to_breakeven && (
                <MetricCard 
                  value={`${r.metrics.days_to_breakeven} days`} 
                  label="Est. Days to BE" 
                />
              )}
            </div>
          )}
          
          {/* Products */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Product Analysis
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              {r.products.map((product, idx) => (
                <ProductCard key={product.product} product={product} index={idx} />
              ))}
            </div>
          </div>
          
          {/* Sensitivity Analysis */}
          {r.sensitivity_analysis && r.sensitivity_analysis.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <LineChart className="w-4 h-4 text-primary" />
                Sensitivity Analysis
              </h4>
              <div className="grid md:grid-cols-2 gap-3">
                {r.sensitivity_analysis.slice(0, 6).map((point, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border bg-muted/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{point.variable}</span>
                      <Badge variant={point.change_from_base > 0 ? "destructive" : "default"} className="text-xs">
                        {point.change_percent > 0 ? '+' : ''}{point.change_percent}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>New BE: {point.new_breakeven.toLocaleString()} units</span>
                      <span className={point.change_from_base > 0 ? 'text-red-500' : 'text-green-500'}>
                        {point.change_from_base > 0 ? '+' : ''}{point.change_from_base.toFixed(0)} units
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Scenarios */}
          {r.scenarios && r.scenarios.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Scenario Analysis
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead className="text-right">BE Units</TableHead>
                    <TableHead className="text-right">BE Revenue</TableHead>
                    <TableHead className="text-right">Profit at Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.scenarios.map((scenario, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{scenario.name}</TableCell>
                      <TableCell className="text-right">{scenario.breakeven_units.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${scenario.breakeven_revenue.toLocaleString()}</TableCell>
                      <TableCell className={`text-right ${scenario.profit_at_target >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${scenario.profit_at_target.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            detail={`Break-even analysis calculates the point where total revenue equals total costs.

■ Break-even Overview

• Break-even Units: ${summary.breakeven_units.toLocaleString()}
• Break-even Revenue: $${summary.breakeven_revenue.toLocaleString()}
• Total Fixed Costs: $${r.total_fixed_cost.toLocaleString()}
• Weighted Avg CM Ratio: ${(r.weighted_avg_cm_ratio * 100).toFixed(1)}%

■ Formula Used

BE Units = Fixed Costs / Contribution Margin per Unit
BE Revenue = Fixed Costs / CM Ratio

■ Product Summary

${r.products.map(p => `• ${p.product}: CM $${p.contribution_margin.toFixed(2)}/unit (${(p.contribution_margin_ratio * 100).toFixed(0)}%), BE ${p.breakeven_units.toLocaleString()} units`).join('\n')}

${r.products.some(p => p.margin_of_safety && p.margin_of_safety > 0) ?
`■ Margin of Safety

${r.products.filter(p => p.margin_of_safety && p.margin_of_safety > 0).map(p => `• ${p.product}: ${(p.margin_of_safety! * 100).toFixed(0)}% above break-even`).join('\n')}` : ''}`}
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
            Understanding the Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Break-even analysis helps you understand the minimum sales needed to cover all costs. Below break-even you lose money; above it you profit." />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Concepts</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "Fixed Costs", content: "Costs that don't change with production volume (rent, salaries, insurance). These must be covered regardless of sales." },
                { num: 2, title: "Variable Costs", content: "Costs that change with each unit produced (materials, direct labor). Higher volume = higher total variable cost." },
                { num: 3, title: "Contribution Margin", content: "Selling price minus variable cost. Each unit's CM contributes to covering fixed costs and profit." },
                { num: 4, title: "Margin of Safety", content: "How far above break-even you are. Higher margin = more buffer before losses." },
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
          
          {/* Product Analysis */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Product-by-Product Analysis</h4>
            <div className="space-y-3">
              {r.products.map((product, idx) => {
                const isHighCM = product.contribution_margin_ratio > 0.4;
                const isProfitable = product.current_profit && product.current_profit > 0;
                
                return (
                  <div key={product.product} className={`p-4 rounded-lg border ${
                    isHighCM ? 'border-green-500/30 bg-green-500/5' :
                    'border-border bg-muted/10'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="font-medium">{product.product}</span>
                        {isHighCM && <Badge variant="outline" className="text-xs text-green-600">High Margin</Badge>}
                      </div>
                      <p className="font-semibold">{(product.contribution_margin_ratio * 100).toFixed(0)}% CM</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isHighCM ? 
                        `Strong contribution margin. Each $1 of revenue contributes $${product.contribution_margin_ratio.toFixed(2)} to covering fixed costs.` :
                        `Lower contribution margin. Consider pricing strategy or cost reduction.`
                      }
                      {isProfitable && ` Currently profitable with ${(product.margin_of_safety! * 100).toFixed(0)}% safety margin.`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          
          <DetailParagraph
            title="Strategic Recommendations"
            detail={`Based on the break-even analysis, here are recommendations.

■ 1. Reduce Break-even Point

To lower your break-even point:
• Reduce fixed costs where possible
• Increase selling prices (if market allows)
• Reduce variable costs per unit
• Shift sales mix toward higher-margin products

■ 2. Improve Contribution Margin

${r.products.filter(p => p.contribution_margin_ratio < 0.3).length > 0 ?
`【Low Margin Products】
${r.products.filter(p => p.contribution_margin_ratio < 0.3).map(p => `• ${p.product}: ${(p.contribution_margin_ratio * 100).toFixed(0)}% CM - Review pricing or costs`).join('\n')}` :
'All products have reasonable contribution margins.'}

■ 3. Margin of Safety

${r.products.filter(p => p.margin_of_safety && p.margin_of_safety > 0.2).length > 0 ?
`Products with healthy safety margins:
${r.products.filter(p => p.margin_of_safety && p.margin_of_safety > 0.2).map(p => `• ${p.product}: ${(p.margin_of_safety! * 100).toFixed(0)}% above break-even`).join('\n')}` :
`Consider increasing sales volume to improve margin of safety.`}

■ 4. Scenario Planning

• Best case: 20% volume increase → Additional profit
• Worst case: 20% volume decrease → Review if still above break-even
• Price increase: 10% price hike → Significant BE reduction

■ 5. Key Metrics to Monitor

• Monthly units sold vs break-even
• Contribution margin by product
• Fixed cost trends
• Margin of safety percentage`}
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
          <h1 className="text-xl font-semibold">Break-even Analysis Report</h1>
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
              <MetricCard value={summary.breakeven_units.toLocaleString()} label="BE Units" highlight />
              <MetricCard value={`$${summary.breakeven_revenue.toLocaleString()}`} label="BE Revenue" />
              <MetricCard value={`${(r.weighted_avg_cm_ratio * 100).toFixed(0)}%`} label="CM Ratio" />
              <MetricCard value={`${summary.solve_time_ms}ms`} label="Analysis Time" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Break-even occurs at {summary.breakeven_units.toLocaleString()} units or ${summary.breakeven_revenue.toLocaleString()} revenue.
              Total fixed costs of ${r.total_fixed_cost.toLocaleString()} with weighted average contribution margin of {(r.weighted_avg_cm_ratio * 100).toFixed(1)}%.
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
                  {visualizations.breakeven_chart && <TabsTrigger value="breakeven_chart" className="text-xs">Break-even</TabsTrigger>}
                  {visualizations.contribution_chart && <TabsTrigger value="contribution_chart" className="text-xs">Contribution</TabsTrigger>}
                  {visualizations.sensitivity_chart && <TabsTrigger value="sensitivity_chart" className="text-xs">Sensitivity</TabsTrigger>}
                  {visualizations.profit_volume_chart && <TabsTrigger value="profit_volume_chart" className="text-xs">Profit-Volume</TabsTrigger>}
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
        
        {/* Product Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Product Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Fixed Cost</TableHead>
                  <TableHead className="text-right">Var Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">CM</TableHead>
                  <TableHead className="text-right">BE Units</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.products.map((p, idx) => (
                  <TableRow key={p.product}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="font-medium">{p.product}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">${p.fixed_cost.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${p.variable_cost}</TableCell>
                    <TableCell className="text-right">${p.selling_price}</TableCell>
                    <TableCell className="text-right">${p.contribution_margin.toFixed(2)} ({(p.contribution_margin_ratio * 100).toFixed(0)}%)</TableCell>
                    <TableCell className="text-right font-medium">{p.breakeven_units.toLocaleString()}</TableCell>
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
                CSV (Products)
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
            onClick={() => setShowGuide(true)}  // 👈 이 줄 수정
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />  {/* 👈 아이콘 변경 */}
            Guide  {/* 👈 텍스트 변경 */}
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
          analysisType={analysisType}
          setAnalysisType={setAnalysisType}
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
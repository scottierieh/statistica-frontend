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
  Package, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Target, BarChart3, Play, Building2, Warehouse, BookMarked,
  TrendingDown, Percent, ShoppingCart, Truck,
  DollarSign, AlertTriangle, Clock, RotateCcw, BookOpen,
  PackageCheck, PackageX, PackageMinus, PackagePlus,
  ArrowUpRight, ArrowDownRight, Boxes, Calculator
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface ABCItem {
  item_id: string;
  item_name: string;
  annual_value: number;
  cumulative_pct: number;
  abc_class: string;
  xyz_class: string;
}

interface EOQResult {
  item_id: string;
  item_name: string;
  annual_demand: number;
  order_cost: number;
  holding_cost: number;
  eoq: number;
  orders_per_year: number;
  total_cost: number;
  current_order_qty: number;
  savings: number;
}

interface SafetyStockResult {
  item_id: string;
  item_name: string;
  avg_demand: number;
  demand_std: number;
  lead_time: number;
  service_level: number;
  safety_stock: number;
  reorder_point: number;
  current_stock: number;
  stock_status: string;
}

interface TurnoverResult {
  item_id: string;
  item_name: string;
  cogs: number;
  avg_inventory: number;
  turnover_ratio: number;
  days_on_hand: number;
  turnover_class: string;
}

interface InventoryResult {
  success: boolean;
  results: {
    summary: {
      total_items: number;
      total_inventory_value: number;
      avg_turnover_ratio: number;
      stockout_risk_items: number;
      overstock_items: number;
      potential_savings: number;
    };
    abc_analysis: ABCItem[];
    eoq_analysis: EOQResult[];
    safety_stock: SafetyStockResult[];
    turnover_analysis: TurnoverResult[];
    abc_summary: {
      class: string;
      item_count: number;
      value_pct: number;
      item_pct: number;
    }[];
    recommendations: {
      priority: string;
      category: string;
      recommendation: string;
      impact: string;
    }[];
  };
  visualizations: {
    abc_pareto?: string;
    abc_pie?: string;
    turnover_distribution?: string;
    stock_status?: string;
    eoq_savings?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_date: string;
    top_abc_a_items: number;
    highest_turnover_item: string;
    solve_time_ms: number;
  };
}

// ============ CONSTANTS ============
const ABC_CLASSES = [
  { class: "A", color: "#22c55e", desc: "High value (top 80%)", threshold: "0-80%" },
  { class: "B", color: "#f59e0b", desc: "Medium value (next 15%)", threshold: "80-95%" },
  { class: "C", color: "#ef4444", desc: "Low value (last 5%)", threshold: "95-100%" },
];

const XYZ_CLASSES = [
  { class: "X", color: "#3b82f6", desc: "Low variability (CV < 0.5)", threshold: "CV < 0.5" },
  { class: "Y", color: "#8b5cf6", desc: "Medium variability (0.5-1.0)", threshold: "0.5 ≤ CV < 1.0" },
  { class: "Z", color: "#ec4899", desc: "High variability (CV ≥ 1.0)", threshold: "CV ≥ 1.0" },
];

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  const categories = ['Electronics', 'Clothing', 'Food', 'Home', 'Sports', 'Beauty'];
  const data: DataRow[] = [];
  
  for (let i = 1; i <= 100; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    // Generate varied demand patterns
    const basePrice = Math.random() < 0.1 ? 500 + Math.random() * 1500 : // 10% high value
                      Math.random() < 0.3 ? 50 + Math.random() * 200 :   // 20% medium value
                      5 + Math.random() * 50;                             // 70% low value
    
    const monthlyDemand = Math.floor(Math.random() * 500) + 10;
    const demandVariability = 0.1 + Math.random() * 1.2; // CV 0.1-1.3
    
    // Generate 12 months of demand
    const demands: number[] = [];
    for (let m = 0; m < 12; m++) {
      const seasonality = 1 + 0.3 * Math.sin((m - 3) * Math.PI / 6); // Peak in summer
      const demand = Math.max(1, Math.floor(monthlyDemand * seasonality * (1 + (Math.random() - 0.5) * demandVariability)));
      demands.push(demand);
    }
    
    const annualDemand = demands.reduce((a, b) => a + b, 0);
    const avgDemand = annualDemand / 12;
    const demandStd = Math.sqrt(demands.reduce((sum, d) => sum + Math.pow(d - avgDemand, 2), 0) / 12);
    
    const leadTime = Math.floor(Math.random() * 14) + 3; // 3-17 days
    const currentStock = Math.floor(avgDemand * (0.5 + Math.random() * 2));
    const orderCost = 20 + Math.random() * 80;
    const holdingCostPct = 0.15 + Math.random() * 0.15;
    
    data.push({
      item_id: `SKU-${String(i).padStart(4, '0')}`,
      item_name: `${category} Item ${i}`,
      category,
      unit_price: parseFloat(basePrice.toFixed(2)),
      annual_demand: annualDemand,
      avg_monthly_demand: parseFloat(avgDemand.toFixed(1)),
      demand_std: parseFloat(demandStd.toFixed(1)),
      current_stock: currentStock,
      lead_time_days: leadTime,
      order_cost: parseFloat(orderCost.toFixed(2)),
      holding_cost_pct: parseFloat(holdingCostPct.toFixed(2)),
      current_order_qty: Math.floor(avgDemand * 2),
      cogs: parseFloat((basePrice * 0.6).toFixed(2)),
    });
  }
  
  return data;
};

// ============ UTILITY COMPONENTS ============
const MetricCard: React.FC<{ 
  value: string | number; 
  label: string; 
  sublabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  negative?: boolean; 
  highlight?: boolean; 
  icon?: React.FC<{ className?: string }> 
}> = ({ value, label, sublabel, trend, negative, highlight, icon: Icon }) => (
  <div className={`text-center p-4 rounded-lg border ${
    negative ? 'border-destructive/30 bg-destructive/5' : 
    highlight ? 'border-primary/30 bg-primary/5' : 
    'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-primary' : negative ? 'text-destructive' : 'text-muted-foreground'}`} />}
    <div className="flex items-center justify-center gap-1">
      <p className={`text-2xl font-semibold ${negative ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
      {trend && (
        trend === 'up' ? <ArrowUpRight className="w-4 h-4 text-green-500" /> :
        trend === 'down' ? <ArrowDownRight className="w-4 h-4 text-red-500" /> : null
      )}
    </div>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
    {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
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

const ProgressBar: React.FC<{ 
  currentStep: number; 
  hasResults: boolean; 
  onStepClick: (step: number) => void 
}> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [
    { num: 1, label: "Intro" },
    { num: 2, label: "Config" },
    { num: 3, label: "Validation" },
    { num: 4, label: "ABC/XYZ" },
    { num: 5, label: "EOQ" },
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
                isCurrent ? "bg-primary text-primary-foreground" :
                isCompleted ? "bg-primary/10 text-primary" :
                isAccessible ? "bg-muted text-muted-foreground hover:bg-muted/80" :
                "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
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

const ABCBadge: React.FC<{ abcClass: string }> = ({ abcClass }) => {
  const colors: { [key: string]: string } = {
    'A': 'bg-green-100 text-green-700',
    'B': 'bg-yellow-100 text-yellow-700',
    'C': 'bg-red-100 text-red-700',
  };
  return <Badge className={`${colors[abcClass] || 'bg-gray-100 text-gray-700'} text-xs font-bold`}>{abcClass}</Badge>;
};

const XYZBadge: React.FC<{ xyzClass: string }> = ({ xyzClass }) => {
  const colors: { [key: string]: string } = {
    'X': 'bg-blue-100 text-blue-700',
    'Y': 'bg-purple-100 text-purple-700',
    'Z': 'bg-pink-100 text-pink-700',
  };
  return <Badge className={`${colors[xyzClass] || 'bg-gray-100 text-gray-700'} text-xs font-bold`}>{xyzClass}</Badge>;
};

const StockStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: { [key: string]: string } = {
    'Optimal': 'bg-green-100 text-green-700',
    'Low': 'bg-yellow-100 text-yellow-700',
    'Stockout Risk': 'bg-red-100 text-red-700',
    'Overstock': 'bg-blue-100 text-blue-700',
  };
  return <Badge className={`${colors[status] || 'bg-gray-100 text-gray-700'} text-xs`}>{status}</Badge>;
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const formatNumber = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
};


const StatisticalGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Inventory Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Inventory Analysis?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Inventory analysis optimizes stock levels by classifying items by value (ABC), variability (XYZ), 
              calculating optimal order quantities (EOQ), and determining safety stock levels. This systematic approach 
              helps balance inventory costs with service level requirements.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analysis Methods
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. ABC Classification (Pareto Analysis)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Identify high-value items requiring tight control<br/>
                  <strong>Method:</strong> Rank items by annual dollar volume (demand × price)<br/>
                  <strong>Classes:</strong><br/>
                  • A: Top 80% of value (typically 20% of items)<br/>
                  • B: Next 15% of value (typically 30% of items)<br/>
                  • C: Last 5% of value (typically 50% of items)<br/>
                  <strong>Application:</strong> Focus management attention on Class A items
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. XYZ Classification (Variability Analysis)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Identify demand predictability<br/>
                  <strong>Method:</strong> Calculate coefficient of variation (CV = std dev / mean)<br/>
                  <strong>Classes:</strong><br/>
                  • X: Low variability (CV {'<'} 0.5) - Predictable demand<br/>
                  • Y: Medium variability (0.5 ≤ CV {'<'} 1.0) - Moderate fluctuation<br/>
                  • Z: High variability (CV ≥ 1.0) - Unpredictable demand<br/>
                  <strong>Application:</strong> Adjust forecasting and safety stock strategies
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. Economic Order Quantity (EOQ)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Minimize total inventory costs<br/>
                  <strong>Formula:</strong> EOQ = √(2DS/H)<br/>
                  • D = Annual demand<br/>
                  • S = Order cost per order<br/>
                  • H = Holding cost per unit per year<br/>
                  <strong>Output:</strong> Optimal order size balancing order and holding costs
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">4. Safety Stock & Reorder Point</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Safety Stock Formula:</strong> SS = z × σ × √LT<br/>
                  • z = Service level factor (95% → 1.65, 99% → 2.33)<br/>
                  • σ = Demand standard deviation<br/>
                  • LT = Lead time in periods<br/>
                  <strong>Reorder Point:</strong> ROP = (Avg Daily Demand × Lead Time) + Safety Stock
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
                <p className="font-medium text-sm">ABC Class</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Value classification based on annual consumption value. A items require tight control and accurate records, 
                  C items can use simple replenishment rules.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">XYZ Class</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Demand variability classification. X items are suitable for JIT, Z items need higher safety stock 
                  to buffer against unpredictable demand.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Inventory Turnover</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Turnover = COGS / Average Inventory. Higher ratios ({'>'} 12x) indicate efficient inventory management. 
                  Low ratios ({'<'} 6x) suggest overstocking or slow-moving items.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Days on Hand</p>
                <p className="text-xs text-muted-foreground mt-1">
                  365 / Turnover Ratio. Indicates how many days of inventory you hold. Lower is generally better, 
                  but must balance with service level requirements.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              ABC-XYZ Matrix Strategy
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>AX (High Value + Predictable):</strong> JIT delivery, tight control, frequent review, minimal safety stock</p>
              <p><strong>AY (High Value + Moderate Var):</strong> Safety stock, weekly monitoring, vendor partnerships</p>
              <p><strong>AZ (High Value + High Var):</strong> Strategic buffer stock, daily monitoring, multiple suppliers</p>
              <p><strong>BX/BY:</strong> Standard EOQ, periodic review, moderate safety stock</p>
              <p><strong>BZ/CX/CY:</strong> Simple reorder rules, lower service levels acceptable</p>
              <p><strong>CZ (Low Value + Unpredictable):</strong> High safety stock, automated reorder, minimal management attention</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Model Assumptions & Limitations
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Constant Demand:</strong> EOQ assumes stable demand; adjust for seasonal patterns</p>
              <p>• <strong>Fixed Costs:</strong> Order and holding costs assumed constant; verify with actual data</p>
              <p>• <strong>Instant Delivery:</strong> Lead time variability requires safety stock adjustments</p>
              <p>• <strong>Independent Items:</strong> Doesn't account for bundled orders or supplier minimums</p>
              <p>• <strong>Normal Distribution:</strong> Safety stock calculations assume normally distributed demand</p>
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
                <p className="font-medium text-sm text-primary mb-1">Data Quality</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use actual demand, not forecasts</li>
                  <li>• Exclude promotional periods if atypical</li>
                  <li>• Verify lead times with suppliers</li>
                  <li>• Update costs quarterly</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Implementation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Review A items weekly, C items quarterly</li>
                  <li>• Adjust service levels by item criticality</li>
                  <li>• Monitor actual vs predicted EOQ performance</li>
                  <li>• Validate safety stock with stockout rates</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Cost Calculation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Order cost: processing, receiving, inspection</li>
                  <li>• Holding cost: warehousing, insurance, obsolescence</li>
                  <li>• Typical holding cost: 15-30% of item value/year</li>
                  <li>• Include opportunity cost of capital</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Common Pitfalls</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Ignoring demand variability in EOQ</li>
                  <li>• Setting same service level for all items</li>
                  <li>• Not updating ABC classification regularly</li>
                  <li>• Overlooking supplier quantity discounts</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> Inventory optimization is an ongoing process. 
              Results depend on data accuracy and stable business conditions. Re-run analysis quarterly 
              and adjust strategies based on actual performance. Combine quantitative analysis with 
              qualitative factors like supplier reliability and product lifecycle stage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};



// ============ INTRO PAGE ============
const IntroPage: React.FC<{ 
  onLoadSample: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Inventory Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Optimize inventory levels with ABC/XYZ classification, Economic Order Quantity (EOQ),
          safety stock calculations, and turnover analysis.
        </p>
      </div>
      
      {/* 👇 통일된 3개 카드 (다른 페이지와 동일한 디자인) */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">ABC/XYZ Classification</p>
              <p className="text-xs text-muted-foreground">Value & variability</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">EOQ Optimization</p>
              <p className="text-xs text-muted-foreground">Order quantity & costs</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Safety Stock & ROP</p>
              <p className="text-xs text-muted-foreground">Buffer & reorder points</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* When to Use Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use Inventory Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">What You'll Learn</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Which items drive 80% of value (ABC)",
                  "Demand variability patterns (XYZ)",
                  "Optimal order quantities (EOQ)",
                  "Safety stock levels needed",
                  "Inventory turnover efficiency",
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
                  "Item ID (SKU)",
                  "Annual demand (units)",
                  "Unit price/cost",
                  "Demand variability (optional)",
                  "Lead time & costs (optional)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {item}
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
              Upload Data
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

// ============ MAIN COMPONENT ============
export default function InventoryAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<InventoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);  


  // Configuration
  const [itemIdCol, setItemIdCol] = useState<string>("");
  const [itemNameCol, setItemNameCol] = useState<string>("");
  const [demandCol, setDemandCol] = useState<string>("");
  const [priceCol, setPriceCol] = useState<string>("");
  const [demandStdCol, setDemandStdCol] = useState<string>("");
  const [leadTimeCol, setLeadTimeCol] = useState<string>("");
  const [orderCostCol, setOrderCostCol] = useState<string>("");
  const [holdingCostCol, setHoldingCostCol] = useState<string>("");
  const [currentStockCol, setCurrentStockCol] = useState<string>("");
  const [serviceLevel, setServiceLevel] = useState<number>(95);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    
    // Auto-configure
    setItemIdCol("item_id");
    setItemNameCol("item_name");
    setDemandCol("annual_demand");
    setPriceCol("unit_price");
    setDemandStdCol("demand_std");
    setLeadTimeCol("lead_time_days");
    setOrderCostCol("order_cost");
    setHoldingCostCol("holding_cost_pct");
    setCurrentStockCol("current_stock");
    
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
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length} items loaded` : "No data"
      },
      {
        name: "Item ID Column",
        passed: !!itemIdCol,
        message: itemIdCol ? `Using: ${itemIdCol}` : "Select item ID column"
      },
      {
        name: "Demand Column",
        passed: !!demandCol,
        message: demandCol ? `Using: ${demandCol}` : "Select demand column"
      },
      {
        name: "Price/Value Column",
        passed: !!priceCol,
        message: priceCol ? `Using: ${priceCol}` : "Select price column"
      },
      {
        name: "Sufficient Data",
        passed: data.length >= 10,
        message: data.length >= 10 ? `${data.length} items (sufficient)` : `Need more items (min 10)`
      },
    ];
  }, [data, itemIdCol, demandCol, priceCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        item_id_col: itemIdCol,
        item_name_col: itemNameCol || null,
        demand_col: demandCol,
        price_col: priceCol,
        demand_std_col: demandStdCol || null,
        lead_time_col: leadTimeCol || null,
        order_cost_col: orderCostCol || null,
        holding_cost_col: holdingCostCol || null,
        current_stock_col: currentStockCol || null,
        service_level: serviceLevel / 100,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: InventoryResult = await res.json();
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
    const rows: string[] = ['Item ID,Item Name,ABC Class,XYZ Class,Annual Value,EOQ,Safety Stock,Reorder Point'];
    results.results.abc_analysis.forEach((item, idx) => {
      const ss = results.results.safety_stock[idx];
      const eoq = results.results.eoq_analysis[idx];
      rows.push(`${item.item_id},${item.item_name},${item.abc_class},${item.xyz_class},${item.annual_value.toFixed(2)},${eoq?.eoq?.toFixed(0) || ''},${ss?.safety_stock?.toFixed(0) || ''},${ss?.reorder_point?.toFixed(0) || ''}`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventory_analysis.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `inventory_${chartKey}.png`;
    a.click();
  };

  // ============ STEP 2: CONFIG ============
  const renderStep2Config = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5 text-primary" />
            Analysis Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Required Columns */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Required Columns
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item ID Column *</Label>
                <Select value={itemIdCol || "__none__"} onValueChange={v => setItemIdCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Select --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Item Name (Optional)</Label>
                <Select value={itemNameCol || "__none__"} onValueChange={v => setItemNameCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Annual Demand Column *</Label>
                <Select value={demandCol || "__none__"} onValueChange={v => setDemandCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Select --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit Price/Cost Column *</Label>
                <Select value={priceCol || "__none__"} onValueChange={v => setPriceCol(v === "__none__" ? "" : v)}>
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
              <Package className="w-4 h-4 text-primary" />
              Optional Columns (for advanced analysis)
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Demand Std Dev</Label>
                <Select value={demandStdCol || "__none__"} onValueChange={v => setDemandStdCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lead Time (days)</Label>
                <Select value={leadTimeCol || "__none__"} onValueChange={v => setLeadTimeCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <Select value={currentStockCol || "__none__"} onValueChange={v => setCurrentStockCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Order Cost</Label>
                <Select value={orderCostCol || "__none__"} onValueChange={v => setOrderCostCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Holding Cost %</Label>
                <Select value={holdingCostCol || "__none__"} onValueChange={v => setHoldingCostCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Service Level (%)</Label>
                <Input type="number" value={serviceLevel} onChange={e => setServiceLevel(Number(e.target.value))} min={80} max={99.9} />
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
  };

  // ============ STEP 3: VALIDATION ============
  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    const canRun = checks.slice(0, 4).every(c => c.passed);
    
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
  // ============ STEP 4: ABC/XYZ RESULTS ============
  const renderStep4ABC = () => {
    if (!results) return null;
    
    const { summary: s, results: r, key_insights } = results;
    
    const finding = `Total inventory value: ${formatCurrency(r.summary.total_inventory_value)}. ` +
      `${r.abc_summary.find(a => a.class === 'A')?.item_count || 0} Class A items represent ~80% of value. ` +
      `${r.summary.stockout_risk_items} items at stockout risk, ${r.summary.overstock_items} overstocked.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Boxes className="w-5 h-5 text-primary" />
            ABC/XYZ Classification Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={formatCurrency(r.summary.total_inventory_value)}
              label="Total Value" 
              icon={DollarSign}
              highlight
            />
            <MetricCard 
              value={r.summary.total_items}
              label="Total Items" 
              icon={Package}
            />
            <MetricCard 
              value={r.summary.stockout_risk_items}
              label="Stockout Risk" 
              icon={AlertTriangle}
              negative={r.summary.stockout_risk_items > 0}
            />
            <MetricCard 
              value={r.summary.overstock_items}
              label="Overstock" 
              icon={PackagePlus}
              negative={r.summary.overstock_items > 5}
            />
          </div>
          
          {/* ABC Summary */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              ABC Classification Summary
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              {r.abc_summary.map((abc) => (
                <div key={abc.class} className={`p-4 rounded-lg border ${
                  abc.class === 'A' ? 'border-green-500/30 bg-green-500/5' :
                  abc.class === 'B' ? 'border-yellow-500/30 bg-yellow-500/5' :
                  'border-red-500/30 bg-red-500/5'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <ABCBadge abcClass={abc.class} />
                    <span className="text-2xl font-bold">{abc.item_count}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(abc.item_pct * 100).toFixed(0)}% of items → {(abc.value_pct * 100).toFixed(0)}% of value
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          {/* ABC-XYZ Matrix */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              ABC-XYZ Matrix
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-2 border"></th>
                    <th className="p-2 border bg-blue-50 text-blue-700">X (Low Var)</th>
                    <th className="p-2 border bg-purple-50 text-purple-700">Y (Med Var)</th>
                    <th className="p-2 border bg-pink-50 text-pink-700">Z (High Var)</th>
                  </tr>
                </thead>
                <tbody>
                  {['A', 'B', 'C'].map(abc => (
                    <tr key={abc}>
                      <td className={`p-2 border font-bold ${
                        abc === 'A' ? 'bg-green-50 text-green-700' :
                        abc === 'B' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-red-50 text-red-700'
                      }`}>{abc}</td>
                      {['X', 'Y', 'Z'].map(xyz => {
                        const count = r.abc_analysis.filter(i => i.abc_class === abc && i.xyz_class === xyz).length;
                        return (
                          <td key={xyz} className="p-2 border text-center">
                            {count > 0 ? count : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              AX items: High value, predictable demand → JIT possible. CZ items: Low value, unpredictable → Safety stock needed.
            </p>
          </div>
          
          {/* Item Details */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Top Items by Value
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>ABC</TableHead>
                  <TableHead>XYZ</TableHead>
                  <TableHead className="text-right">Annual Value</TableHead>
                  <TableHead className="text-right">Cum %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.abc_analysis.slice(0, 15).map((item) => (
                  <TableRow key={item.item_id}>
                    <TableCell className="font-mono text-sm">{item.item_id}</TableCell>
                    <TableCell className="truncate max-w-32">{item.item_name}</TableCell>
                    <TableCell><ABCBadge abcClass={item.abc_class} /></TableCell>
                    <TableCell><XYZBadge xyzClass={item.xyz_class} /></TableCell>
                    <TableCell className="text-right">{formatCurrency(item.annual_value)}</TableCell>
                    <TableCell className="text-right">{(item.cumulative_pct * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Key Insights */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.slice(0, 4).map((insight, idx) => (
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
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">
              View EOQ & Safety Stock
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 5: EOQ & SAFETY STOCK ============
  const renderStep5EOQ = () => {
    if (!results) return null;
    
    const { results: r } = results;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="w-5 h-5 text-primary" />
            EOQ & Safety Stock Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={`Potential savings from EOQ optimization: ${formatCurrency(r.summary.potential_savings)}. Average turnover ratio: ${r.summary.avg_turnover_ratio.toFixed(1)}x.`} />
          
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard 
              value={formatCurrency(r.summary.potential_savings)}
              label="Potential Savings" 
              sublabel="from EOQ"
              icon={DollarSign}
              highlight
            />
            <MetricCard 
              value={`${r.summary.avg_turnover_ratio.toFixed(1)}x`}
              label="Avg Turnover" 
              icon={RotateCcw}
            />
            <MetricCard 
              value={r.summary.stockout_risk_items}
              label="Below Reorder Point" 
              icon={AlertTriangle}
              negative={r.summary.stockout_risk_items > 0}
            />
          </div>
          
          {/* EOQ Analysis */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Economic Order Quantity (EOQ)
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Annual Demand</TableHead>
                  <TableHead className="text-right">Current Qty</TableHead>
                  <TableHead className="text-right">Optimal EOQ</TableHead>
                  <TableHead className="text-right">Orders/Year</TableHead>
                  <TableHead className="text-right">Savings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.eoq_analysis.slice(0, 10).map((item) => (
                  <TableRow key={item.item_id}>
                    <TableCell>
                      <div>
                        <p className="font-mono text-sm">{item.item_id}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-24">{item.item_name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(item.annual_demand)}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.current_order_qty)}</TableCell>
                    <TableCell className="text-right font-medium text-primary">{formatNumber(item.eoq)}</TableCell>
                    <TableCell className="text-right">{item.orders_per_year.toFixed(1)}</TableCell>
                    <TableCell className={`text-right ${item.savings > 0 ? 'text-green-600' : ''}`}>
                      {item.savings > 0 ? formatCurrency(item.savings) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <Separator />
          
          {/* Safety Stock & Reorder Point */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Safety Stock & Reorder Points
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Avg Demand</TableHead>
                  <TableHead className="text-right">Lead Time</TableHead>
                  <TableHead className="text-right">Safety Stock</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.safety_stock.slice(0, 10).map((item) => (
                  <TableRow key={item.item_id}>
                    <TableCell className="font-mono text-sm">{item.item_id}</TableCell>
                    <TableCell className="text-right">{item.avg_demand.toFixed(0)}/day</TableCell>
                    <TableCell className="text-right">{item.lead_time} days</TableCell>
                    <TableCell className="text-right font-medium">{item.safety_stock.toFixed(0)}</TableCell>
                    <TableCell className="text-right font-medium text-primary">{item.reorder_point.toFixed(0)}</TableCell>
                    <TableCell className="text-right">{item.current_stock}</TableCell>
                    <TableCell><StockStatusBadge status={item.stock_status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <Separator />
          
          {/* Turnover Analysis */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary" />
              Inventory Turnover
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">COGS</TableHead>
                  <TableHead className="text-right">Avg Inventory</TableHead>
                  <TableHead className="text-right">Turnover</TableHead>
                  <TableHead className="text-right">Days on Hand</TableHead>
                  <TableHead>Class</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.turnover_analysis.slice(0, 10).map((item) => (
                  <TableRow key={item.item_id}>
                    <TableCell className="font-mono text-sm">{item.item_id}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.cogs)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.avg_inventory)}</TableCell>
                    <TableCell className="text-right font-medium">{item.turnover_ratio.toFixed(1)}x</TableCell>
                    <TableCell className="text-right">{item.days_on_hand.toFixed(0)}</TableCell>
                    <TableCell>
                      <Badge variant={item.turnover_class === 'Fast' ? 'default' : item.turnover_class === 'Slow' ? 'destructive' : 'secondary'} className="text-xs">
                        {item.turnover_class}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <DetailParagraph
            title="Inventory Management Guide"
            detail={`■ EOQ (Economic Order Quantity)

EOQ = √(2DS/H) where D=annual demand, S=order cost, H=holding cost
Balances ordering costs vs holding costs to minimize total cost.

■ Safety Stock

SS = z × σ × √LT
• z = service level factor (95% → 1.65, 99% → 2.33)
• σ = demand standard deviation
• LT = lead time in periods

■ Reorder Point

ROP = (Average Daily Demand × Lead Time) + Safety Stock
Order when inventory drops to this level.

■ Inventory Turnover

Turnover = COGS / Average Inventory
• >12 = Fast mover (excellent)
• 6-12 = Normal
• <6 = Slow mover (concern)

■ ABC-XYZ Strategy Matrix

• AX: High value, stable → JIT, tight control
• AY: High value, variable → Safety stock + monitoring
• AZ: High value, volatile → Strategic buffer
• CZ: Low value, volatile → Higher safety stock, less attention`}
          />
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to ABC/XYZ</Button>
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
    
    const { summary: s, results: r, visualizations } = results;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Inventory Analysis Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {r.summary.total_items} Items | {s.analysis_date}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={formatCurrency(r.summary.total_inventory_value)} label="Total Value" />
              <MetricCard value={`${r.summary.avg_turnover_ratio.toFixed(1)}x`} label="Avg Turnover" />
              <MetricCard value={formatCurrency(r.summary.potential_savings)} label="Potential Savings" />
              <MetricCard value={r.summary.stockout_risk_items} label="At Risk" />
            </div>
            <p className="text-sm text-muted-foreground">
              Analysis of {r.summary.total_items} inventory items. 
              {r.abc_summary.find(a => a.class === 'A')?.item_count || 0} Class A items represent majority of value.
              {r.summary.stockout_risk_items > 0 && ` ${r.summary.stockout_risk_items} items require immediate reorder attention.`}
            </p>
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
                  {visualizations.abc_pareto && <TabsTrigger value="abc_pareto" className="text-xs">ABC Pareto</TabsTrigger>}
                  {visualizations.abc_pie && <TabsTrigger value="abc_pie" className="text-xs">ABC Pie</TabsTrigger>}
                  {visualizations.turnover_distribution && <TabsTrigger value="turnover_distribution" className="text-xs">Turnover</TabsTrigger>}
                  {visualizations.stock_status && <TabsTrigger value="stock_status" className="text-xs">Stock Status</TabsTrigger>}
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
        
        {/* Recommendations */}
        {r.recommendations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {r.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <Badge variant={rec.priority === 'High' ? 'destructive' : rec.priority === 'Medium' ? 'default' : 'secondary'} className="text-xs shrink-0">
                      {rec.priority}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{rec.recommendation}</p>
                      <p className="text-xs text-muted-foreground">{rec.category} | Impact: {rec.impact}</p>
                    </div>
                  </div>
                ))}
              </div>
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
                CSV (Full Analysis)
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
    <div className="container mx-auto py-8 px-4 max-w-5xl">

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

      {currentStep > 1 && (
        <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />
      )}
      
      {currentStep === 1 && (
        <IntroPage 
          onLoadSample={handleLoadSample} 
          onFileUpload={handleFileUpload} 
        />
      )}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4ABC()}
      {currentStep === 5 && renderStep5EOQ()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}

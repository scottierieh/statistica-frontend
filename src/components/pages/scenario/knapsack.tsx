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
  Backpack, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Package, DollarSign, Weight, Target, BarChart3, Play, Zap,
  Check, X, Percent, Scale, Box, Briefcase, BookOpen, BookMarked, AlertTriangle
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface SelectedItem {
  item_id: string;
  value: number;
  weight: number;
  efficiency: number;
}

interface KnapsackResult {
  success: boolean;
  results: {
    selected_items: SelectedItem[];
    excluded_items: SelectedItem[];
    total_value: number;
    total_weight: number;
    capacity: number;
    utilization: number;
    num_selected: number;
    num_total: number;
    metrics: {
      avg_efficiency: number;
      value_density: number;
      weight_utilization: number;
      theoretical_max: number;
    };
  };
  visualizations: {
    selection_chart?: string;
    efficiency_chart?: string;
    capacity_chart?: string;
    value_weight_scatter?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    problem_type: string;
    algorithm: string;
    capacity: number;
    total_value: number;
    solve_time_ms: number;
  };
}

// ============ CONSTANTS ============
const PROBLEM_TYPES = [
  { value: "0_1", label: "0/1 Knapsack", desc: "Each item can be selected once", icon: Package },
  { value: "bounded", label: "Bounded Knapsack", desc: "Items have quantity limits", icon: Box },
  { value: "unbounded", label: "Unbounded Knapsack", desc: "Unlimited item quantities", icon: Briefcase },
];

const ITEM_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  const categories = ['Electronics', 'Jewelry', 'Art', 'Collectibles', 'Equipment'];
  const items: DataRow[] = [];
  
  const itemTemplates = [
    { name: 'Laptop', value: 1500, weight: 3, category: 'Electronics' },
    { name: 'Camera', value: 800, weight: 1.5, category: 'Electronics' },
    { name: 'Tablet', value: 600, weight: 0.8, category: 'Electronics' },
    { name: 'Phone', value: 1000, weight: 0.3, category: 'Electronics' },
    { name: 'Watch', value: 2000, weight: 0.2, category: 'Jewelry' },
    { name: 'Necklace', value: 3000, weight: 0.1, category: 'Jewelry' },
    { name: 'Ring', value: 1500, weight: 0.05, category: 'Jewelry' },
    { name: 'Painting', value: 5000, weight: 8, category: 'Art' },
    { name: 'Sculpture', value: 2500, weight: 15, category: 'Art' },
    { name: 'Vase', value: 800, weight: 3, category: 'Art' },
    { name: 'Coin Set', value: 1200, weight: 0.5, category: 'Collectibles' },
    { name: 'Stamp Album', value: 600, weight: 0.3, category: 'Collectibles' },
    { name: 'Vintage Toy', value: 400, weight: 0.8, category: 'Collectibles' },
    { name: 'Power Tool', value: 350, weight: 5, category: 'Equipment' },
    { name: 'Drone', value: 900, weight: 2, category: 'Equipment' },
  ];
  
  itemTemplates.forEach((item, idx) => {
    items.push({
      item_id: `ITEM_${String(idx + 1).padStart(3, '0')}`,
      item_name: item.name,
      value: item.value,
      weight: item.weight,
      category: item.category,
      quantity: Math.floor(Math.random() * 3) + 1,
    });
  });
  
  return items;
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
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />}
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
    a.download = 'knapsack_items.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} items</Badge>
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
                {columns.slice(0, 6).map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 10).map((row, i) => (
                <TableRow key={i}>
                  {columns.slice(0, 6).map(col => (
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
              Showing first 10 of {data.length} items
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

const ItemCard: React.FC<{ 
  item: SelectedItem; 
  index: number; 
  selected: boolean 
}> = ({ item, index, selected }) => {
  const color = ITEM_COLORS[index % ITEM_COLORS.length];
  
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      selected ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/10'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold`} 
           style={{ backgroundColor: selected ? color : '#9ca3af' }}>
        {selected ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.item_id}</p>
        <p className="text-xs text-muted-foreground">
          Efficiency: {item.efficiency.toFixed(1)} $/kg
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-sm">${item.value}</p>
        <p className="text-xs text-muted-foreground">{item.weight}kg</p>
      </div>
    </div>
  );
};
// ============ INTRO PAGE ============

const StatisticalGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Knapsack Problem Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is the Knapsack Problem?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Knapsack Problem is a classic optimization problem: given a set of items with values and weights, 
              select items to maximize total value without exceeding capacity. It's fundamental in resource allocation, 
              portfolio optimization, and decision-making under constraints.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Problem Variants
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">0/1 Knapsack</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Constraint:</strong> Each item can be selected at most once<br/>
                  <strong>Algorithm:</strong> Dynamic Programming: O(n × W) time, O(W) space<br/>
                  <strong>Use case:</strong> Unique items (artworks, equipment), one-time decisions<br/>
                  <strong>Example:</strong> Which projects to fund with limited budget
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Bounded Knapsack</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Constraint:</strong> Each item has a quantity limit (e.g., max 5 units)<br/>
                  <strong>Algorithm:</strong> Extended DP: O(n × W × max_quantity)<br/>
                  <strong>Use case:</strong> Limited inventory, bulk purchasing with caps<br/>
                  <strong>Example:</strong> Stock portfolio with position limits per asset
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Unbounded Knapsack</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Constraint:</strong> Unlimited quantity of each item available<br/>
                  <strong>Algorithm:</strong> Simplified DP: O(n × W)<br/>
                  <strong>Use case:</strong> Unlimited supply (coin change, bulk goods)<br/>
                  <strong>Example:</strong> Filling a shipping container with boxes (unlimited stock)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Dynamic Programming Approach
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Core Algorithm</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Build a 2D table dp[i][w] where dp[i][w] = maximum value achievable with first i items and weight limit w.<br/>
                  <strong>Recurrence:</strong> dp[i][w] = max(dp[i-1][w], dp[i-1][w-weight[i]] + value[i])<br/>
                  <strong>Base case:</strong> dp[0][w] = 0 (no items = no value)<br/>
                  <strong>Answer:</strong> dp[n][W] (all items considered, full capacity)
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Space Optimization</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Instead of 2D array, use 1D array updated iteratively (rolling array technique). 
                  Reduces space from O(n × W) to O(W), crucial for large capacities.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Backtracking</p>
                <p className="text-xs text-muted-foreground mt-1">
                  After building the DP table, trace back to identify which items were selected. 
                  Start from dp[n][W] and work backwards, checking when value increased.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Key Metrics Explained
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Total Value</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sum of values of all selected items. This is what the algorithm maximizes. 
                  Higher total value = better solution quality.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Capacity Utilization</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Percentage of capacity used: (total_weight / capacity) × 100. Target 85-95%. 
                  Below 70% suggests poor packing; 100% is rarely achievable due to discrete weights.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Item Efficiency</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Value per unit weight: value / weight. Items are often sorted by efficiency (greedy heuristic). 
                  However, highest efficiency doesn't guarantee selection in optimal solution.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Value Density</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Average value per weight across selected items: total_value / total_weight. 
                  Indicates solution quality - higher density means better value extraction per unit resource.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Interpreting Results
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>High utilization ({'>'} 90%):</strong> Excellent packing. Items fit capacity well with minimal waste.</p>
              
              <p><strong>Medium utilization (70-90%):</strong> Good solution. Some weight left unused due to discrete item sizes.</p>
              
              <p><strong>Low utilization ({'<'} 70%):</strong> Poor fit. Consider: (1) smaller items to fill gaps, (2) different capacity, (3) fractional knapsack if items are divisible.</p>
              
              <p><strong>High-value items excluded:</strong> Their weight prevented inclusion despite high value. May indicate capacity is too small.</p>
              
              <p><strong>All low-efficiency items selected:</strong> Capacity may be too large, or high-efficiency items are too heavy.</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Common Issues & Solutions
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Low Capacity Usage</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> Utilization {'<'} 60%<br/>
                  <strong>Causes:</strong> Item weights don't match capacity increments<br/>
                  <strong>Solutions:</strong> Add smaller items, adjust capacity, allow fractional selection if applicable
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: No Feasible Solution</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> No items selected<br/>
                  <strong>Causes:</strong> All items exceed capacity<br/>
                  <strong>Solutions:</strong> Increase capacity, reduce item weights, check data quality
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Unexpected Selection</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> Low-efficiency items selected<br/>
                  <strong>Causes:</strong> Weight constraints force this choice<br/>
                  <strong>Solutions:</strong> Review item combinations, check if result is actually optimal
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Slow Performance</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> Long computation time<br/>
                  <strong>Causes:</strong> Large capacity or many items<br/>
                  <strong>Solutions:</strong> Use greedy approximation, reduce capacity granularity, implement branch-and-bound
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
                <p className="font-medium text-sm text-primary mb-1">Data Preparation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Ensure all values and weights are positive</li>
                  <li>• Use consistent units (all kg, all $, etc.)</li>
                  <li>• Remove items with weight {'>'} capacity</li>
                  <li>• Validate data quality (no nulls/negatives)</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Capacity Selection</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Set realistic constraints based on real limits</li>
                  <li>• For budget: use actual available funds</li>
                  <li>• For weight: account for container/vehicle limits</li>
                  <li>• Leave 5-10% buffer for practical considerations</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Result Validation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Verify total weight ≤ capacity</li>
                  <li>• Check if result makes business sense</li>
                  <li>• Compare against greedy solution as sanity check</li>
                  <li>• Review excluded high-value items manually</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Optimization Tips</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Pre-sort items by efficiency for faster DP</li>
                  <li>• Remove dominated items (lower value, higher weight)</li>
                  <li>• Use greedy for quick approximation first</li>
                  <li>• Consider branch-and-bound for very large problems</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Real-World Applications
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Investment Portfolio</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Select investments to maximize returns within budget. Value = expected return, 
                  Weight = investment amount. Bounded knapsack for position limits.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Project Selection</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose projects to maximize ROI within resource constraints. Value = project benefit, 
                  Weight = required resources (time/budget). 0/1 knapsack for mutually exclusive projects.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Cargo Loading</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pack items to maximize cargo value within weight limit. Critical for shipping, 
                  logistics, and space missions where every kilogram matters.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Resource Allocation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Allocate limited resources (CPU, memory, budget) to tasks/processes to maximize throughput 
                  or value. Common in cloud computing and operating systems.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Feature Selection (ML)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Select features for machine learning model within computational budget. Value = feature importance, 
                  Weight = computation cost. Prevents overfitting while maintaining performance.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Advanced Variations
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Fractional Knapsack:</strong> Items can be divided (e.g., liquids, bulk materials). 
              Greedy algorithm is optimal: O(n log n). Select by efficiency until capacity filled.</p>
              
              <p><strong>Multiple Knapsacks:</strong> Pack items into multiple bins/containers, each with capacity. 
              More complex; use bin packing algorithms or ILP solvers.</p>
              
              <p><strong>Multi-dimensional Knapsack:</strong> Multiple constraints (weight, volume, cost limits simultaneously). 
              NP-hard; requires approximation algorithms or heuristics for large instances.</p>
              
              <p><strong>Quadratic Knapsack:</strong> Value depends on item pairs (synergies/conflicts). 
              Much harder; typically requires sophisticated optimization techniques.</p>
              
              <p><strong>Online Knapsack:</strong> Items arrive sequentially; decisions must be made without future knowledge. 
              Competitive algorithms aim to approximate optimal offline solution.</p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> The Knapsack Problem is NP-hard, meaning 
              no known polynomial-time algorithm solves all instances optimally. Dynamic programming works well 
              for moderate capacities (pseudo-polynomial time), but for very large capacities or item counts, 
              approximation algorithms (FPTAS) or heuristics may be necessary to get solutions in reasonable time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


const IntroPage: React.FC<{ 
  problemType: string;
  setProblemType: (type: string) => void;
  onLoadSample: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ problemType, setProblemType, onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Backpack className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Knapsack Problem</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select items to maximize total value while staying within weight/capacity constraints.
          Perfect for budget allocation, resource selection, and portfolio optimization.
        </p>
      </div>
      
      {/* 👇 3개 카드 추가 */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Value Maximization</p>
              <p className="text-xs text-muted-foreground">Optimize total benefit</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Capacity Constraints</p>
              <p className="text-xs text-muted-foreground">Weight/budget limits</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Dynamic Programming</p>
              <p className="text-xs text-muted-foreground">Optimal solution</p>
            </div>
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use Knapsack Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Use Cases</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Budget allocation for projects",
                  "Investment portfolio selection",
                  "Cargo loading optimization",
                  "Resource allocation planning",
                  "Feature selection in ML",
                ].map((use) => (
                  <li key={use} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {use}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Required Data</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Item ID (unique identifier)",
                  "Value (benefit/profit)",
                  "Weight (cost/resource)",
                  "Quantity (optional, for bounded)",
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
      
      {/* ✅ 버튼도 그대로 유지 */}
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
export default function KnapsackPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<KnapsackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false); 
  
  // Configuration
  const [problemType, setProblemType] = useState<string>("0_1");
  const [itemIdCol, setItemIdCol] = useState<string>("");
  const [valueCol, setValueCol] = useState<string>("");
  const [weightCol, setWeightCol] = useState<string>("");
  const [quantityCol, setQuantityCol] = useState<string>("");
  const [capacity, setCapacity] = useState<number>(20);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setItemIdCol("item_id");
    setValueCol("value");
    setWeightCol("weight");
    setQuantityCol("quantity");
    setCapacity(20);
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

  const totalWeight = React.useMemo(() => {
    if (!weightCol || data.length === 0) return 0;
    return data.reduce((sum, row) => sum + (Number(row[weightCol]) || 0), 0);
  }, [data, weightCol]);

  const totalValue = React.useMemo(() => {
    if (!valueCol || data.length === 0) return 0;
    return data.reduce((sum, row) => sum + (Number(row[valueCol]) || 0), 0);
  }, [data, valueCol]);

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const checks: ValidationCheck[] = [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length} items loaded` : "No data loaded"
      },
      {
        name: "Item ID Column",
        passed: !!itemIdCol,
        message: itemIdCol ? `Using: ${itemIdCol}` : "Select item ID column"
      },
      {
        name: "Value Column",
        passed: !!valueCol,
        message: valueCol ? `Total: $${totalValue.toLocaleString()}` : "Select value column"
      },
      {
        name: "Weight Column",
        passed: !!weightCol,
        message: weightCol ? `Total: ${totalWeight.toFixed(1)}kg` : "Select weight column"
      },
      {
        name: "Capacity Set",
        passed: capacity > 0,
        message: capacity > 0 ? `Capacity: ${capacity}kg` : "Set capacity > 0"
      },
    ];
    
    if (problemType === 'bounded') {
      checks.push({
        name: "Quantity Column",
        passed: !!quantityCol,
        message: quantityCol ? `Using: ${quantityCol}` : "Required for bounded knapsack"
      });
    }
    
    return checks;
  }, [data, itemIdCol, valueCol, weightCol, quantityCol, capacity, problemType, totalValue, totalWeight]);

  const runOptimization = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        item_id_col: itemIdCol,
        value_col: valueCol,
        weight_col: weightCol,
        quantity_col: quantityCol || null,
        problem_type: problemType,
        capacity: capacity,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/knapsack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Optimization failed");
      }
      
      const result: KnapsackResult = await res.json();
      setResults(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!results) return;
    const items = results.results.selected_items;
    
    const rows: string[] = ['Item ID,Value,Weight,Efficiency'];
    items.forEach(item => {
      rows.push(`${item.item_id},${item.value},${item.weight},${item.efficiency.toFixed(2)}`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'knapsack_selection.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `knapsack_${chartKey}.png`;
    a.click();
  };

  const handleDownloadWord = async () => {
    if (!results) return;
    try {
      const res = await fetch(`/api/export/knapsack-docx`, {  // FASTAPI_URL 제거
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          results, 
          problemType,
          capacity
        })
      });
      if (!res.ok) throw new Error("Report generation failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `knapsack_report_${new Date().toISOString().split('T')[0]}.docx`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed");
    }
  };

  // ============ STEP 2: CONFIG ============
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Knapsack
        </CardTitle>
        <CardDescription>
          Problem Type: {PROBLEM_TYPES.find(t => t.value === problemType)?.label}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Problem Type
        </h4>
        <div className="grid md:grid-cols-3 gap-4">
          {/* 0/1 Knapsack */}
          <button
            onClick={() => setProblemType('0_1')}
            className={`p-4 rounded-lg border text-left transition-all ${
              problemType === '0_1'
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-primary" />
              <p className="font-medium">0/1 Knapsack</p>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Each item can be selected once
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Best for:</strong> Unique items, project selection, one-time decisions.
            </p>
          </button>

          {/* Bounded Knapsack */}
          <button
            onClick={() => setProblemType('bounded')}
            className={`p-4 rounded-lg border text-left transition-all ${
              problemType === 'bounded'
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Box className="w-5 h-5 text-primary" />
              <p className="font-medium">Bounded</p>
              <Badge variant="secondary" className="text-xs">Recommended</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Items have quantity limits
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Best for:</strong> Limited inventory, resource allocation with caps.
            </p>
          </button>

          {/* Unbounded Knapsack */}
          <button
            onClick={() => setProblemType('unbounded')}
            className={`p-4 rounded-lg border text-left transition-all ${
              problemType === 'unbounded'
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-5 h-5 text-primary" />
              <p className="font-medium">Unbounded</p>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Unlimited item quantities
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Best for:</strong> Unlimited supply, coin change, bulk purchasing.
            </p>
          </button>
        </div>
      </div>
      
      <Separator />

        
        
        {/* Column Mapping */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Column Mapping
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Item ID *</Label>
              <Select value={itemIdCol || "__none__"} onValueChange={v => setItemIdCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value (Benefit) *</Label>
              <Select value={valueCol || "__none__"} onValueChange={v => setValueCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Weight (Cost) *</Label>
              <Select value={weightCol || "__none__"} onValueChange={v => setWeightCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {problemType === 'bounded' && (
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Select value={quantityCol || "__none__"} onValueChange={v => setQuantityCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Select --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Capacity Setting */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            Capacity Constraint
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Maximum Capacity (kg)</Label>
              <Input 
                type="number" 
                value={capacity} 
                onChange={(e) => setCapacity(Number(e.target.value))}
                min={1}
              />
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/10">
              <p className="text-sm text-muted-foreground">
                Total weight of all items: <span className="font-semibold">{totalWeight.toFixed(1)}kg</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Capacity utilization possible: <span className="font-semibold">{((capacity / totalWeight) * 100).toFixed(0)}%</span>
              </p>
            </div>
          </div>
        </div>
        
        {/* Data Preview */}
        {data.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Data Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg border border-border bg-muted/10 text-center">
                  <p className="text-2xl font-semibold">{data.length}</p>
                  <p className="text-xs text-muted-foreground">Items</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10 text-center">
                  <p className="text-2xl font-semibold">${totalValue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10 text-center">
                  <p className="text-2xl font-semibold">{totalWeight.toFixed(1)}kg</p>
                  <p className="text-xs text-muted-foreground">Total Weight</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10 text-center">
                  <p className="text-2xl font-semibold">{capacity}kg</p>
                  <p className="text-xs text-muted-foreground">Capacity</p>
                </div>
              </div>
            </div>
          </>
        )}
        
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
                  {`Problem: ${PROBLEM_TYPES.find(t => t.value === problemType)?.label} • `}
                  {`${data.length} items • Capacity: ${capacity}kg`}
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
            <Button onClick={runOptimization} disabled={loading || !canRun} className="gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Optimization
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
    
    const finding = `Optimal selection: ${r.num_selected} of ${r.num_total} items selected. Total value: $${r.total_value.toLocaleString()} using ${r.total_weight.toFixed(1)}kg of ${r.capacity}kg capacity (${r.utilization.toFixed(1)}% utilization).`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Knapsack Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={`$${r.total_value.toLocaleString()}`} label="Total Value" icon={DollarSign} highlight />
            <MetricCard value={`${r.total_weight.toFixed(1)}kg`} label="Total Weight" icon={Weight} />
            <MetricCard value={r.num_selected} label="Items Selected" icon={Check} />
            <MetricCard value={`${r.utilization.toFixed(0)}%`} label="Capacity Used" icon={Percent} />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={`$${r.metrics.avg_efficiency.toFixed(0)}/kg`} label="Avg Efficiency" />
            <MetricCard value={`$${r.metrics.value_density.toFixed(0)}/kg`} label="Value Density" />
            <MetricCard value={r.num_total - r.num_selected} label="Items Excluded" />
            <MetricCard value={`${(r.capacity - r.total_weight).toFixed(1)}kg`} label="Remaining Capacity" />
          </div>
          
          {/* Selected Items */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Selected Items ({r.selected_items.length})
            </h4>
            <div className="grid md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {r.selected_items.map((item, idx) => (
                <ItemCard key={idx} item={item} index={idx} selected={true} />
              ))}
            </div>
          </div>
          
          {/* Excluded Items */}
          {r.excluded_items.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                <XCircle className="w-4 h-4" />
                Excluded Items ({r.excluded_items.length})
              </h4>
              <div className="grid md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {r.excluded_items.slice(0, 6).map((item, idx) => (
                  <ItemCard key={idx} item={item} index={idx} selected={false} />
                ))}
              </div>
              {r.excluded_items.length > 6 && (
                <p className="text-xs text-muted-foreground text-center">
                  ... and {r.excluded_items.length - 6} more excluded items
                </p>
              )}
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
            detail={`This knapsack optimization was solved using dynamic programming via Google OR-Tools.

■ Problem Overview

• Problem Type: ${PROBLEM_TYPES.find(t => t.value === problemType)?.label}
• Total Items: ${r.num_total}
• Capacity: ${r.capacity}kg

■ Solution Quality

• Items Selected: ${r.num_selected} (${((r.num_selected / r.num_total) * 100).toFixed(0)}%)
• Total Value Achieved: $${r.total_value.toLocaleString()}
• Weight Used: ${r.total_weight.toFixed(1)}kg of ${r.capacity}kg
• Capacity Utilization: ${r.utilization.toFixed(1)}%

■ Efficiency Analysis

• Average Efficiency: $${r.metrics.avg_efficiency.toFixed(2)}/kg
• Value Density: $${r.metrics.value_density.toFixed(2)}/kg
• Remaining Capacity: ${(r.capacity - r.total_weight).toFixed(1)}kg

${r.utilization < 90 ? 
`Note: Capacity utilization is below 90%. This may indicate:
• Item weights don't perfectly fit the capacity
• High-value items have weights that leave gaps
• Consider smaller items to fill remaining space` : 
`Excellent capacity utilization achieved.`}`}
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
          <FindingBox finding="The Knapsack Problem finds the optimal combination of items to maximize value while respecting capacity constraints. It uses dynamic programming for exact solutions." />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">How Knapsack Optimization Works</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "Calculate Efficiency", content: "For each item, compute value/weight ratio (efficiency). Higher efficiency items give more value per unit weight." },
                { num: 2, title: "Dynamic Programming", content: "Build a table of optimal values for each weight limit from 0 to capacity. Time complexity: O(n × capacity)." },
                { num: 3, title: "Backtrack Selection", content: "Trace back through the DP table to identify which items were included in the optimal solution." },
                { num: 4, title: "Verify Constraints", content: "Ensure total weight ≤ capacity and all selection constraints (0/1, bounded, unbounded) are satisfied." },
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
          
          {/* Item Analysis */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Item-by-Item Analysis</h4>
            <div className="space-y-3">
              {r.selected_items.slice(0, 5).map((item, idx) => {
                const isMostEfficient = item.efficiency === Math.max(...r.selected_items.map(i => i.efficiency));
                const isMostValuable = item.value === Math.max(...r.selected_items.map(i => i.value));
                
                return (
                  <div key={idx} className={`p-4 rounded-lg border ${
                    isMostEfficient ? 'border-green-500/30 bg-green-500/5' :
                    isMostValuable ? 'border-blue-500/30 bg-blue-500/5' :
                    'border-border bg-muted/10'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.item_id}</span>
                        {isMostEfficient && <Badge variant="outline" className="text-xs text-green-600">Most Efficient</Badge>}
                        {isMostValuable && !isMostEfficient && <Badge variant="outline" className="text-xs text-blue-600">Highest Value</Badge>}
                      </div>
                      <p className="font-semibold">${item.value}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>Weight: {item.weight}kg</div>
                      <div>Efficiency: ${item.efficiency.toFixed(1)}/kg</div>
                      <div>% of Total: {((item.value / r.total_value) * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <DetailParagraph
            title="Strategic Recommendations"
            detail={`Based on the knapsack optimization results, here are strategic recommendations.

■ 1. Selection Strategy

${r.utilization >= 95 ? 
`【Optimal Packing Achieved】
Capacity is well-utilized at ${r.utilization.toFixed(1)}%. The selection maximizes value within constraints.` :
`【Room for Improvement】
Current utilization: ${r.utilization.toFixed(1)}%
Unused capacity: ${(r.capacity - r.total_weight).toFixed(1)}kg

Consider:
• Adding smaller high-value items
• Splitting items if divisibility is allowed
• Adjusting capacity constraint`}

■ 2. Efficiency Analysis

Top performing items by efficiency:
${r.selected_items
  .sort((a, b) => b.efficiency - a.efficiency)
  .slice(0, 3)
  .map((item, i) => `${i + 1}. ${item.item_id}: $${item.efficiency.toFixed(1)}/kg`)
  .join('\n')}

■ 3. Excluded Items Review

${r.excluded_items.length > 0 ?
`${r.excluded_items.length} items were excluded. Top excluded by value:
${r.excluded_items
  .sort((a, b) => b.value - a.value)
  .slice(0, 3)
  .map((item, i) => `${i + 1}. ${item.item_id}: $${item.value} (${item.weight}kg, $${item.efficiency.toFixed(1)}/kg)`)
  .join('\n')}

These items were excluded due to:
• Weight exceeding remaining capacity
• Lower efficiency compared to selected items
• Constraint violations` :
'All items were selected.'}

■ 4. Sensitivity Analysis

If capacity increases:
• +10% capacity (${(r.capacity * 1.1).toFixed(1)}kg): May include additional items
• +20% capacity (${(r.capacity * 1.2).toFixed(1)}kg): Significant value increase possible

If capacity decreases:
• -10% capacity (${(r.capacity * 0.9).toFixed(1)}kg): Would need to remove ${Math.ceil(r.selected_items.length * 0.1)} items`}
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
          <h1 className="text-xl font-semibold">Knapsack Optimization Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {PROBLEM_TYPES.find(t => t.value === problemType)?.label} | {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={`$${r.total_value.toLocaleString()}`} label="Total Value" highlight />
              <MetricCard value={`${r.utilization.toFixed(0)}%`} label="Utilization" />
              <MetricCard value={r.num_selected} label="Items Selected" />
              <MetricCard value={`${summary.solve_time_ms}ms`} label="Solve Time" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Selected {r.num_selected} of {r.num_total} items achieving total value of ${r.total_value.toLocaleString()}.
              Used {r.total_weight.toFixed(1)}kg of {r.capacity}kg capacity ({r.utilization.toFixed(1)}% utilization).
              Average efficiency: ${r.metrics.avg_efficiency.toFixed(2)}/kg.
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
                  {visualizations.selection_chart && <TabsTrigger value="selection_chart" className="text-xs">Selection</TabsTrigger>}
                  {visualizations.efficiency_chart && <TabsTrigger value="efficiency_chart" className="text-xs">Efficiency</TabsTrigger>}
                  {visualizations.capacity_chart && <TabsTrigger value="capacity_chart" className="text-xs">Capacity</TabsTrigger>}
                  {visualizations.value_weight_scatter && <TabsTrigger value="value_weight_scatter" className="text-xs">Value vs Weight</TabsTrigger>}
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
        
        {/* Selection Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selected Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Efficiency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.selected_items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{item.item_id}</TableCell>
                    <TableCell className="text-right">${item.value}</TableCell>
                    <TableCell className="text-right">{item.weight}kg</TableCell>
                    <TableCell className="text-right">${item.efficiency.toFixed(1)}/kg</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/20 font-medium">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">${r.total_value.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{r.total_weight.toFixed(1)}kg</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
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
                CSV (Selected Items)
              </Button>
              <Button variant="outline" onClick={handleDownloadWord} className="gap-2">
              <FileText className="w-4 h-4" />
              Word Report
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
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Optimization</Button>
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
          problemType={problemType}
          setProblemType={setProblemType}
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

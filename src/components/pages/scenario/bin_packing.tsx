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
  Download, TrendingUp, Settings, Activity, ChevronRight, AlertTriangle,
  Box, Layers, Container, Maximize, Weight, Play,
  Target, BarChart3, Grid3X3, Boxes, Archive, Truck, BookOpen, BookMarked,
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface BinAssignment {
  bin_id: number;
  items: string[];
  item_sizes: number[];
  total_size: number;
  remaining_capacity: number;
  utilization: number;
}

interface BinPackingResult {
  success: boolean;
  results: {
    bins: BinAssignment[];
    num_bins_used: number;
    total_items: number;
    total_size: number;
    bin_capacity: number;
    avg_utilization: number;
    min_utilization: number;
    max_utilization: number;
    wasted_space: number;
    unassigned_items: string[];
  };
  visualizations: {
    bin_visualization?: string;
    utilization_chart?: string;
    size_distribution?: string;
    bin_comparison?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    algorithm: string;
    num_items: number;
    num_bins: number;
    bin_capacity: number;
    avg_utilization: number;
    solve_time_ms: number;
  };
}

const ALGORITHM_TYPES = [
  { value: "first_fit_decreasing", label: "First Fit Decreasing", desc: "Most common, good performance", icon: Box },
  { value: "best_fit_decreasing", label: "Best Fit Decreasing", desc: "Minimizes wasted space", icon: Maximize },
  { value: "optimal", label: "Optimal (OR-Tools)", desc: "Finds optimal solution (slower)", icon: Target },
];

const BIN_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const generateSampleData = (): DataRow[] => {
  const items: DataRow[] = [];
  const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Toys'];
  
  for (let i = 1; i <= 50; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    let size: number;
    let weight: number;
    
    // Different size distributions by category
    switch (category) {
      case 'Electronics':
        size = 15 + Math.floor(Math.random() * 35);
        weight = 0.5 + Math.random() * 3;
        break;
      case 'Clothing':
        size = 5 + Math.floor(Math.random() * 20);
        weight = 0.2 + Math.random() * 1;
        break;
      case 'Food':
        size = 10 + Math.floor(Math.random() * 25);
        weight = 0.3 + Math.random() * 2;
        break;
      case 'Books':
        size = 8 + Math.floor(Math.random() * 15);
        weight = 0.5 + Math.random() * 1.5;
        break;
      default:
        size = 10 + Math.floor(Math.random() * 30);
        weight = 0.3 + Math.random() * 2;
    }
    
    items.push({
      item_id: `ITEM_${String(i).padStart(3, '0')}`,
      item_name: `${category}_${i}`,
      size: size,
      weight: parseFloat(weight.toFixed(2)),
      category: category,
      fragile: Math.random() > 0.8 ? 'Yes' : 'No',
      priority: Math.random() > 0.7 ? 'High' : 'Normal',
    });
  }
  
  return items;
};

const MetricCard: React.FC<{ value: string | number; label: string; negative?: boolean; highlight?: boolean; icon?: React.FC<{ className?: string }> }> = ({ value, label, negative, highlight, icon: Icon }) => (
  <div className={`text-center p-4 rounded-lg border ${negative ? 'border-destructive/30 bg-destructive/5' : highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
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
    a.download = 'bin_packing_items.csv';
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

const ProgressBar: React.FC<{ currentStep: number; hasResults: boolean; onStepClick: (step: number) => void }> = ({ currentStep, hasResults, onStepClick }) => {
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

const BinVisualization: React.FC<{ bin: BinAssignment; capacity: number; index: number }> = ({ bin, capacity, index }) => {
  const color = BIN_COLORS[index % BIN_COLORS.length];
  const fillHeight = (bin.total_size / capacity) * 100;
  
  return (
    <div className="flex flex-col items-center">
      <div className="w-20 h-32 border-2 border-border rounded-lg relative overflow-hidden bg-muted/20">
        <div 
          className="absolute bottom-0 left-0 right-0 transition-all duration-500"
          style={{ height: `${fillHeight}%`, backgroundColor: color, opacity: 0.7 }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold">{bin.utilization.toFixed(0)}%</span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-xs font-medium">Bin {bin.bin_id}</p>
        <p className="text-xs text-muted-foreground">{bin.items.length} items</p>
      </div>
    </div>
  );
};

const BinCard: React.FC<{ bin: BinAssignment; capacity: number; index: number }> = ({ bin, capacity, index }) => {
  const color = BIN_COLORS[index % BIN_COLORS.length];
  
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: color }}>
            {bin.bin_id}
          </div>
          <div>
            <p className="font-medium">Bin {bin.bin_id}</p>
            <p className="text-xs text-muted-foreground">{bin.items.length} items</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">{bin.utilization.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">{bin.total_size}/{capacity}</p>
        </div>
      </div>
      
      {/* Utilization Bar */}
      <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
        <div 
          className="h-full rounded-full transition-all"
          style={{ width: `${bin.utilization}%`, backgroundColor: color }}
        />
      </div>
      
      {/* Items */}
      <div className="flex flex-wrap gap-1">
        {bin.items.slice(0, 8).map((item, idx) => (
          <Badge key={idx} variant="secondary" className="text-xs">
            {item} ({bin.item_sizes[idx]})
          </Badge>
        ))}
        {bin.items.length > 8 && (
          <Badge variant="outline" className="text-xs">+{bin.items.length - 8} more</Badge>
        )}
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
            <h2 className="text-lg font-semibold">Bin Packing Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Bin Packing?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bin packing is a combinatorial optimization problem that packs items into the minimum number 
              of bins (containers) while respecting capacity constraints. It's a classic NP-hard problem with 
              applications in logistics, manufacturing, and resource allocation.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Algorithms Explained
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. First Fit Decreasing (FFD)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>How it works:</strong> Sort items by size (largest first), then place each item 
                  in the first bin that has enough space<br/>
                  <strong>Complexity:</strong> O(n log n) for sorting + O(n²) worst case for placement<br/>
                  <strong>Quality:</strong> Uses at most 11/9 × OPT + 6/9 bins (theoretical guarantee)<br/>
                  <strong>Best for:</strong> Most practical applications, good balance of speed and quality
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. Best Fit Decreasing (BFD)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>How it works:</strong> Sort items by size, then place each item in the bin 
                  with minimum remaining space that can fit the item<br/>
                  <strong>Complexity:</strong> O(n log n) for sorting + O(n²) for placement<br/>
                  <strong>Quality:</strong> Similar to FFD, often slightly better space utilization<br/>
                  <strong>Best for:</strong> When minimizing wasted space is critical
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. Optimal (Google OR-Tools)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>How it works:</strong> Uses constraint programming to explore solution space 
                  and find provably optimal assignments<br/>
                  <strong>Complexity:</strong> Exponential worst case (NP-hard problem)<br/>
                  <strong>Quality:</strong> Guaranteed optimal solution for small instances<br/>
                  <strong>Best for:</strong> Critical applications where finding the absolute best solution 
                  justifies longer computation time (typically {'<'} 100 items)
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
                <p className="font-medium text-sm">Bins Used</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total number of bins required to pack all items. Lower is better. Compare against 
                  theoretical minimum: ⌈total_size / bin_capacity⌉
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Average Utilization</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Mean percentage of bin capacity used across all bins. Formula: (total_size / (bins_used × capacity)) × 100. 
                  Target: 70-90%. Above 90% is excellent; below 60% indicates poor packing.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Wasted Space</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total unused capacity across all bins. Formula: (bins_used × capacity) - total_size. 
                  Lower wasted space = better packing efficiency.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Efficiency</p>
                <p className="text-xs text-muted-foreground mt-1">
                  How close the solution is to theoretical minimum. Formula: (theoretical_min / bins_used) × 100. 
                  100% = optimal; 90%+ = very good; below 80% suggests trying different algorithm.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Theoretical Minimum</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lower bound on bins needed, calculated as: ⌈total_size / capacity⌉. 
                  The actual solution cannot be better than this, but may require more bins due to item sizes.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Algorithm Selection Guide
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Use First Fit Decreasing when:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• You have 100+ items (fast performance matters)</li>
                <li>• Solution quality within 10-20% of optimal is acceptable</li>
                <li>• You need results in under 1 second</li>
                <li>• Packing many containers daily (speed {'>'} perfection)</li>
              </ul>
              <p className="mt-3"><strong>Use Best Fit Decreasing when:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Minimizing wasted space is critical</li>
                <li>• Bin/container costs are very high</li>
                <li>• You have 50-200 items (manageable computation)</li>
                <li>• Slightly better quality worth 2-3x computation time</li>
              </ul>
              <p className="mt-3"><strong>Use Optimal (OR-Tools) when:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• You have {'<'} 50 items (feasible computation)</li>
                <li>• Finding absolute best solution is critical</li>
                <li>• High-value items or expensive containers</li>
                <li>• One-time planning (not real-time packing)</li>
                <li>• Can wait 10-60 seconds for result</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Boxes className="w-4 h-4" />
              Understanding Results
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Interpreting Utilization:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• 85-95%: Excellent packing, near-optimal</li>
                <li>• 70-85%: Good packing, typical for heuristics</li>
                <li>• 60-70%: Acceptable but room for improvement</li>
                <li>• Below 60%: Poor packing, review bin size or algorithm</li>
              </ul>
              <p className="mt-3"><strong>Why not 100% utilization?</strong></p>
              <p className="ml-4">Perfect packing is usually impossible due to discrete item sizes. 
              Example: 100-unit bin with items [70, 40] requires 2 bins even though total = 110.</p>
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
                <p className="font-medium text-sm text-primary mb-1">Issue: Low Utilization</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> Average utilization {'<'} 60%<br/>
                  <strong>Causes:</strong> Bin capacity too large, item sizes poorly matched<br/>
                  <strong>Solutions:</strong> Reduce bin size, group similar items, try BFD algorithm
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Too Many Bins</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> Bins used {'>>'} theoretical minimum<br/>
                  <strong>Causes:</strong> Poor algorithm choice, fragmented sizes<br/>
                  <strong>Solutions:</strong> Use optimal algorithm, increase bin capacity if flexible
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Unassigned Items</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> Some items not packed<br/>
                  <strong>Causes:</strong> Items larger than bin capacity, max bins limit hit<br/>
                  <strong>Solutions:</strong> Increase bin capacity, remove max bins constraint
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Slow Performance</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> Optimization takes {'>'} 30 seconds<br/>
                  <strong>Causes:</strong> Too many items for optimal algorithm<br/>
                  <strong>Solutions:</strong> Use FFD/BFD for large instances, batch process
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
                  <li>• Verify item sizes are accurate</li>
                  <li>• Include packaging in item sizes</li>
                  <li>• Account for irregular shapes (use bounding box)</li>
                  <li>• Consider weight limits if relevant</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Bin Configuration</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Set realistic capacity (account for handling)</li>
                  <li>• Leave 5-10% buffer for safety</li>
                  <li>• Consider weight and volume limits</li>
                  <li>• Use standard container sizes when possible</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Operational Tips</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Label bins with contents for easy retrieval</li>
                  <li>• Pack heavy items at bottom</li>
                  <li>• Group fragile items separately</li>
                  <li>• Document bin assignments for tracking</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Validation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Verify all items are assigned</li>
                  <li>• Check no bin exceeds capacity</li>
                  <li>• Compare against theoretical minimum</li>
                  <li>• Test physical packing if critical</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Real-World Applications
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Shipping & Logistics</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pack customer orders into minimum shipping boxes. Reduce shipping costs by 15-25% 
                  through optimal container utilization.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Warehouse Management</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Allocate items to storage bins or pallets. Maximize warehouse space usage and 
                  reduce required storage locations.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Cloud Computing</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Assign virtual machines to physical servers. Minimize number of servers needed, 
                  reducing energy costs and improving resource efficiency.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Manufacturing</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cutting stock problem: cut smaller pieces from larger stock materials with minimum waste. 
                  Reduce material costs by 10-20%.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Container className="w-4 h-4" />
              Advanced Considerations
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Multi-dimensional Bin Packing:</strong> This tool handles 1D size constraints. 
              For 2D/3D packing (length × width × height), specialized algorithms needed.</p>
              
              <p><strong>Weight Constraints:</strong> If both volume and weight matter, enable weight 
              capacity to enforce dual constraints. Items must fit both size and weight limits.</p>
              
              <p><strong>Item Compatibility:</strong> Some items cannot be packed together (fragile + heavy, 
              food + chemicals). Pre-group incompatible items or pack separately.</p>
              
              <p><strong>Loading Sequence:</strong> The order items are packed matters for unloading. 
              Pack last-needed items first (back of truck), first-needed items last (front).</p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Performance Tip:</strong> For very large datasets (1000+ items), 
              consider pre-processing: group similar-sized items, use FFD for initial solution, then 
              apply local optimization to promising bins. This hybrid approach balances speed and quality.
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
          <Package className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Bin Packing Optimization</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Pack items into the minimum number of bins while respecting capacity constraints.
          Optimize container loading, warehouse storage, and shipping efficiency.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
        {ALGORITHM_TYPES.map((type) => (
          <div key={type.value} className="p-5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <type.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use Bin Packing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Use Cases</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Container/truck loading",
                  "Warehouse shelf allocation",
                  "Shipping box optimization",
                  "Cloud VM allocation",
                  "Cutting stock problems",
                ].map((use) => (
                  <li key={use} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {use}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Item ID column",
                  "Item size/volume column",
                  "Bin capacity setting",
                  "Optional: item weight, category",
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

export default function BinPackingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<BinPackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  // Configuration
  const [itemIdCol, setItemIdCol] = useState<string>("");
  const [sizeCol, setSizeCol] = useState<string>("");
  const [weightCol, setWeightCol] = useState<string>("");
  const [categoryCol, setCategoryCol] = useState<string>("");
  
  const [algorithm, setAlgorithm] = useState<string>("first_fit_decreasing");
  const [binCapacity, setBinCapacity] = useState<string>("100");
  const [weightCapacity, setWeightCapacity] = useState<string>("");
  const [maxBins, setMaxBins] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setItemIdCol("item_id");
    setSizeCol("size");
    setWeightCol("weight");
    setCategoryCol("category");
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

  const totalSize = React.useMemo(() => {
    if (!sizeCol || data.length === 0) return 0;
    return data.reduce((sum, d) => sum + (Number(d[sizeCol]) || 0), 0);
  }, [data, sizeCol]);

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const capacity = parseInt(binCapacity) || 0;
    const maxItemSize = sizeCol ? Math.max(...data.map(d => Number(d[sizeCol]) || 0)) : 0;
    
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
        name: "Size Column",
        passed: !!sizeCol,
        message: sizeCol ? `Total size: ${totalSize}` : "Select size column"
      },
      {
        name: "Bin Capacity",
        passed: capacity > 0,
        message: capacity > 0 ? `Capacity: ${capacity} per bin` : "Set bin capacity"
      },
      {
        name: "Capacity >= Max Item",
        passed: capacity >= maxItemSize,
        message: capacity >= maxItemSize ? `OK (max item: ${maxItemSize})` : `Capacity too small (max item: ${maxItemSize})`
      }
    ];
    
    return checks;
  }, [data, itemIdCol, sizeCol, totalSize, binCapacity]);

  const runOptimization = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        item_id_col: itemIdCol,
        size_col: sizeCol,
        weight_col: weightCol || null,
        category_col: categoryCol || null,
        algorithm,
        bin_capacity: parseInt(binCapacity),
        weight_capacity: weightCapacity ? parseFloat(weightCapacity) : null,
        max_bins: maxBins ? parseInt(maxBins) : null,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/bin-packing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Optimization failed");
      }
      
      const result: BinPackingResult = await res.json();
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
    const bins = results.results.bins;
    
    const rows: string[] = ['Bin,Item,Size'];
    bins.forEach(bin => {
      bin.items.forEach((item, idx) => {
        rows.push(`${bin.bin_id},${item},${bin.item_sizes[idx]}`);
      });
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bin_packing_result.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `bin_packing_${chartKey}.png`;
    a.click();
  };

  const handleDownloadWord = async () => {
    if (!results) return;
    try {
      const res = await fetch(`/api/export/bin-packing-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          results, 
          algorithm,
          binCapacity
        })
      });
      if (!res.ok) throw new Error("Report generation failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `bin_packing_report_${new Date().toISOString().split('T')[0]}.docx`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed");
    }
  };


  // Step 2: Configuration
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Bin Packing
        </CardTitle>
        <CardDescription>Set up bin packing parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Algorithm */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Algorithm
          </h4>
          <div className="grid md:grid-cols-3 gap-3">
            {ALGORITHM_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setAlgorithm(type.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  algorithm === type.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <type.icon className="w-5 h-5 text-primary mb-2" />
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.desc}</p>
              </button>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Required Columns */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Box className="w-4 h-4 text-primary" />
            Required Columns
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
              <Label>Size/Volume *</Label>
              <Select value={sizeCol || "__none__"} onValueChange={v => setSizeCol(v === "__none__" ? "" : v)}>
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
        
        {/* Bin Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Container className="w-4 h-4 text-primary" />
            Bin Settings
          </h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Bin Capacity *</Label>
              <Input type="number" min="1" value={binCapacity} onChange={e => setBinCapacity(e.target.value)} />
              <p className="text-xs text-muted-foreground">Max size per bin</p>
            </div>
            <div className="space-y-2">
              <Label>Weight Capacity</Label>
              <Input type="number" placeholder="No limit" value={weightCapacity} onChange={e => setWeightCapacity(e.target.value)} />
              <p className="text-xs text-muted-foreground">Optional</p>
            </div>
            <div className="space-y-2">
              <Label>Max Bins</Label>
              <Input type="number" placeholder="No limit" value={maxBins} onChange={e => setMaxBins(e.target.value)} />
              <p className="text-xs text-muted-foreground">Optional limit</p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Optional Columns */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Optional Columns
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weight Column</Label>
              <Select value={weightCol || "__none__"} onValueChange={v => setWeightCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Optional --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category Column</Label>
              <Select value={categoryCol || "__none__"} onValueChange={v => setCategoryCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Optional --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Summary Preview */}
        {sizeCol && (
          <>
            <Separator />
            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <h4 className="font-medium text-sm mb-3">Data Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Items</p>
                  <p className="font-semibold">{data.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Size</p>
                  <p className="font-semibold">{totalSize}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Min Bins Needed</p>
                  <p className="font-semibold">{Math.ceil(totalSize / (parseInt(binCapacity) || 1))}</p>
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
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${check.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}>
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
                  {`Algorithm: ${ALGORITHM_TYPES.find(t => t.value === algorithm)?.label} • `}
                  {`Capacity: ${binCapacity} • `}
                  {`${data.length} items • Total size: ${totalSize}`}
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

  // Step 4: Summary
  const renderStep4Summary = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights } = results;
    
    const minBinsTheoretical = Math.ceil(r.total_size / r.bin_capacity);
    const efficiency = (minBinsTheoretical / r.num_bins_used) * 100;
    
    const finding = `${r.total_items} items packed into ${r.num_bins_used} bins with ${r.avg_utilization.toFixed(1)}% average utilization. Theoretical minimum: ${minBinsTheoretical} bins (${efficiency.toFixed(0)}% efficiency). Total wasted space: ${r.wasted_space} units.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Bin Packing Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={r.num_bins_used} label="Bins Used" icon={Archive} highlight />
            <MetricCard value={r.total_items} label="Total Items" icon={Box} />
            <MetricCard value={`${r.avg_utilization.toFixed(1)}%`} label="Avg Utilization" icon={BarChart3} />
            <MetricCard value={r.wasted_space} label="Wasted Space" negative={r.wasted_space > r.total_size * 0.2} />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={minBinsTheoretical} label="Theoretical Min" />
            <MetricCard value={`${efficiency.toFixed(0)}%`} label="Efficiency" />
            <MetricCard value={`${r.min_utilization.toFixed(0)}%`} label="Min Utilization" />
            <MetricCard value={`${r.max_utilization.toFixed(0)}%`} label="Max Utilization" />
          </div>
          
          {/* Bin Visualization */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Boxes className="w-4 h-4 text-primary" />
              Bin Fill Levels
            </h4>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {r.bins.slice(0, 10).map((bin, idx) => (
                <BinVisualization key={bin.bin_id} bin={bin} capacity={r.bin_capacity} index={idx} />
              ))}
              {r.bins.length > 10 && (
                <div className="flex items-center justify-center w-20">
                  <p className="text-sm text-muted-foreground">+{r.bins.length - 10} more</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Bin Cards */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Bin Details</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {r.bins.slice(0, 6).map((bin, idx) => (
                <BinCard key={bin.bin_id} bin={bin} capacity={r.bin_capacity} index={idx} />
              ))}
            </div>
            {r.bins.length > 6 && (
              <p className="text-sm text-muted-foreground text-center">
                ... and {r.bins.length - 6} more bins
              </p>
            )}
          </div>
          
          {/* Unassigned Items */}
          {r.unassigned_items.length > 0 && (
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <h4 className="font-medium text-sm text-destructive mb-2">Unassigned Items ({r.unassigned_items.length})</h4>
              <div className="flex flex-wrap gap-2">
                {r.unassigned_items.slice(0, 10).map((item, idx) => (
                  <Badge key={idx} variant="destructive">{item}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These items could not be assigned. Check bin capacity or max bins limit.
              </p>
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
            detail={`This bin packing optimization used the ${summary.algorithm.replace(/_/g, ' ')} algorithm.

■ Bin Packing Overview
Bin Packing is an optimization problem that packs given items into the minimum number of bins (containers).

• Problem Size:
  - Items: ${r.total_items}
  - Total Size: ${r.total_size}
  - Bin Capacity: ${r.bin_capacity}

• Solution Quality:
  - Bins Used: ${r.num_bins_used}
  - Theoretical Minimum: ${minBinsTheoretical}
  - Efficiency: ${efficiency.toFixed(1)}%

■ Utilization Analysis

• Average Utilization: ${r.avg_utilization.toFixed(1)}%
• Range: ${r.min_utilization.toFixed(1)}% - ${r.max_utilization.toFixed(1)}%
• Total Wasted Space: ${r.wasted_space} units

${r.avg_utilization >= 80 ? '✓ Excellent packing efficiency' : 
  r.avg_utilization >= 65 ? '△ Good packing efficiency with room for improvement' :
  '⚠ Low utilization - consider different bin sizes or algorithm'}

■ Algorithm Performance

${summary.algorithm === 'optimal' ? 
  'OR-Tools found an optimal or near-optimal solution through exhaustive search.' :
  summary.algorithm === 'first_fit_decreasing' ?
  'First Fit Decreasing sorted items by size and placed each in the first bin with space.' :
  'Best Fit Decreasing placed each item in the bin with minimum remaining space.'}`}
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

  // Step 5: Why
  const renderStep5Why = () => {
    if (!results) return null;
    
    const { results: r } = results;
    const minBins = Math.ceil(r.total_size / r.bin_capacity);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5 text-primary" />
            Understanding the Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Bin Packing optimization minimizes the number of bins needed while ensuring no bin exceeds capacity. The goal is to maximize space utilization and reduce waste." />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Algorithm Comparison</h4>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { name: "First Fit Decreasing", time: "O(n log n)", quality: "Good", desc: "Sort items descending, place in first bin with space. Fast and effective for most cases." },
                { name: "Best Fit Decreasing", time: "O(n²)", quality: "Better", desc: "Sort items descending, place in bin with minimum remaining space. Reduces fragmentation." },
                { name: "Optimal (OR-Tools)", time: "Exponential", quality: "Best", desc: "Uses constraint programming to find optimal solution. Best quality but slower." },
              ].map((alg, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">{alg.name}</p>
                  <div className="flex gap-2 mt-1 mb-2">
                    <Badge variant="outline" className="text-xs">{alg.time}</Badge>
                    <Badge variant="secondary" className="text-xs">{alg.quality}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{alg.desc}</p>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Bin-by-Bin Analysis</h4>
            <div className="space-y-3">
              {r.bins.slice(0, 5).map((bin, idx) => {
                const isWellPacked = bin.utilization >= 80;
                const isPoorlyPacked = bin.utilization < 50;
                
                return (
                  <div key={bin.bin_id} className={`p-4 rounded-lg border ${isPoorlyPacked ? 'border-amber-500/30 bg-amber-500/5' : isWellPacked ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-muted/10'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: BIN_COLORS[idx % BIN_COLORS.length] }}>
                          {bin.bin_id}
                        </div>
                        <span className="font-medium">Bin {bin.bin_id}</span>
                        {isWellPacked && <Badge variant="outline" className="text-xs text-green-600">Well Packed</Badge>}
                        {isPoorlyPacked && <Badge variant="outline" className="text-xs text-amber-600">Low Fill</Badge>}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Items</p>
                        <p className="font-medium">{bin.items.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Size</p>
                        <p className="font-medium">{bin.total_size}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Remaining</p>
                        <p className="font-medium">{bin.remaining_capacity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Utilization</p>
                        <p className={`font-medium ${bin.utilization >= 80 ? 'text-green-600' : bin.utilization < 50 ? 'text-amber-600' : ''}`}>
                          {bin.utilization.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {r.bins.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... and {r.bins.length - 5} more bins
                </p>
              )}
            </div>
          </div>
          
          <DetailParagraph
            title="Strategic Recommendations"
            detail={`Based on the bin packing results, here are recommendations for improving packing efficiency.

■ 1. Efficiency Assessment

Current Performance:
• Bins Used: ${r.num_bins_used}
• Theoretical Minimum: ${minBins}
• Efficiency Gap: ${r.num_bins_used - minBins} extra bins (${((r.num_bins_used - minBins) / minBins * 100).toFixed(1)}% overhead)

${r.num_bins_used === minBins ? '✓ Optimal solution achieved!' :
  r.num_bins_used <= minBins * 1.1 ? '✓ Near-optimal solution (within 10% of theoretical minimum)' :
  r.num_bins_used <= minBins * 1.2 ? '△ Good solution but room for improvement' :
  '⚠ Consider using optimal algorithm for better results'}

■ 2. Utilization Improvement

${r.avg_utilization < 70 ? 
`【Low Average Utilization: ${r.avg_utilization.toFixed(1)}%】

Recommendations:
• Review bin capacity - may be too large for item sizes
• Consider variable bin sizes if available
• Group similar-sized items together before packing
• Try Best Fit Decreasing algorithm for better space usage` :
`【Good Utilization: ${r.avg_utilization.toFixed(1)}%】

Current packing is efficient. Focus on maintaining consistency.`}

■ 3. Operational Recommendations

【For Warehouse Operations】
• Label bins clearly with contents list
• Place heavy items at bottom
• Keep frequently accessed items near bin opening
• Track bin locations for easy retrieval

【For Shipping】
• Use bins with highest utilization first
• Consider consolidating low-fill bins if possible
• Add padding for fragile items
• Weight-balance bins in containers

■ 4. Cost Implications

Estimated savings from optimization:
• Bins saved vs naive packing: ~${Math.max(0, Math.ceil(r.total_items * 0.3) - r.num_bins_used)} bins
• Space utilization improvement: ${r.avg_utilization.toFixed(0)}%
• Shipping cost reduction potential: ${(r.avg_utilization / 100 * 20).toFixed(0)}%

■ 5. When to Re-optimize

• Item mix changes significantly
• Bin capacity changes
• New size categories added
• Seasonal demand shifts`}
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

  // Step 6: Report
  const renderStep6Report = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights, visualizations } = results;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Bin Packing Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {summary.algorithm.replace(/_/g, ' ')} | {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={r.num_bins_used} label="Bins Used" highlight />
              <MetricCard value={r.total_items} label="Items Packed" />
              <MetricCard value={`${r.avg_utilization.toFixed(0)}%`} label="Avg Utilization" />
              <MetricCard value={`${summary.solve_time_ms}ms`} label="Solve Time" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Successfully packed {r.total_items} items into {r.num_bins_used} bins
              with {r.avg_utilization.toFixed(1)}% average space utilization.
              Total wasted space: {r.wasted_space} units across all bins.
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
                  {visualizations.bin_visualization && <TabsTrigger value="bin_visualization" className="text-xs">Bins</TabsTrigger>}
                  {visualizations.utilization_chart && <TabsTrigger value="utilization_chart" className="text-xs">Utilization</TabsTrigger>}
                  {visualizations.size_distribution && <TabsTrigger value="size_distribution" className="text-xs">Size Dist.</TabsTrigger>}
                  {visualizations.bin_comparison && <TabsTrigger value="bin_comparison" className="text-xs">Comparison</TabsTrigger>}
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
        
        {/* Bin Summary Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bin Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bin</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Size Used</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.bins.map((bin, idx) => (
                  <TableRow key={bin.bin_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: BIN_COLORS[idx % BIN_COLORS.length] }} />
                        Bin {bin.bin_id}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{bin.items.length}</TableCell>
                    <TableCell className="text-right">{bin.total_size}</TableCell>
                    <TableCell className="text-right">{bin.remaining_capacity}</TableCell>
                    <TableCell className="text-right font-medium">{bin.utilization.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/20 font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{r.total_items}</TableCell>
                  <TableCell className="text-right">{r.total_size}</TableCell>
                  <TableCell className="text-right">{r.wasted_space}</TableCell>
                  <TableCell className="text-right">{r.avg_utilization.toFixed(1)}%</TableCell>
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
                CSV (Bin Assignments)
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
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Packing</Button>
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

      
      {currentStep > 1 && (
        <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />
      )}
      
      {currentStep > 1 && data.length > 0 && (
        <DataPreview data={data} columns={columns} />
      )}
      
      {currentStep === 1 && <IntroPage onLoadSample={handleLoadSample} onFileUpload={handleFileUpload} />}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}
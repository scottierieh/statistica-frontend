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
import { Slider } from "@/components/ui/slider";
import {
  ShoppingCart, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Link2, Percent, Package, ArrowRightLeft, Layers, Network,
  Zap, Target, BarChart3, Filter, Star, GitBranch, BookOpen
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface AssociationRule {
  antecedents: string[];
  consequents: string[];
  support: number;
  confidence: number;
  lift: number;
  conviction: number;
  leverage: number;
  antecedent_support: number;
  consequent_support: number;
}

interface FrequentItemset {
  itemsets: string[];
  support: number;
  length: number;
}

interface BasketAnalysisResult {
  success: boolean;
  results: {
    association_rules: AssociationRule[];
    frequent_itemsets: FrequentItemset[];
    item_frequencies: { [key: string]: number };
    metrics: {
      total_transactions: number;
      unique_items: number;
      avg_basket_size: number;
      total_rules: number;
      max_lift: number;
      avg_confidence: number;
    };
  };
  visualizations: {
    item_frequency?: string;
    rule_network?: string;
    support_confidence?: string;
    lift_matrix?: string;
    itemset_treemap?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    algorithm: string;
    total_transactions: number;
    total_rules: number;
    min_support: number;
    min_confidence: number;
  };
}

const ALGORITHM_TYPES = [
  { value: "apriori", label: "Apriori Algorithm", desc: "Classic rule mining", icon: GitBranch },
  { value: "fpgrowth", label: "FP-Growth", desc: "Fast pattern growth (recommended)", icon: Zap },
  { value: "fpmax", label: "FP-Max", desc: "Maximal frequent itemsets", icon: Layers },
];

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const products = [
    'Bread', 'Milk', 'Eggs', 'Butter', 'Cheese', 'Yogurt', 'Coffee', 'Tea',
    'Sugar', 'Cereal', 'Orange Juice', 'Apple', 'Banana', 'Chicken', 'Beef',
    'Fish', 'Rice', 'Pasta', 'Tomato Sauce', 'Olive Oil', 'Salt', 'Pepper',
    'Onion', 'Garlic', 'Lettuce', 'Tomato', 'Cucumber', 'Carrot', 'Potato',
    'Wine', 'Beer', 'Chips', 'Chocolate', 'Ice Cream', 'Cookies', 'Water'
  ];
  
  // Define common item associations for realistic data
  const commonBaskets = [
    ['Bread', 'Milk', 'Butter'],
    ['Bread', 'Eggs', 'Butter', 'Milk'],
    ['Coffee', 'Sugar', 'Milk'],
    ['Tea', 'Sugar', 'Cookies'],
    ['Pasta', 'Tomato Sauce', 'Olive Oil', 'Garlic'],
    ['Rice', 'Chicken', 'Onion', 'Garlic'],
    ['Beef', 'Potato', 'Carrot', 'Onion'],
    ['Fish', 'Lemon', 'Rice', 'Olive Oil'],
    ['Lettuce', 'Tomato', 'Cucumber', 'Olive Oil'],
    ['Cereal', 'Milk', 'Banana'],
    ['Wine', 'Cheese', 'Bread'],
    ['Beer', 'Chips'],
    ['Chocolate', 'Ice Cream'],
    ['Orange Juice', 'Eggs', 'Bread'],
    ['Yogurt', 'Apple', 'Banana'],
    ['Coffee', 'Milk', 'Cookies'],
    ['Chicken', 'Rice', 'Tomato'],
    ['Pasta', 'Cheese', 'Tomato Sauce'],
  ];

  for (let transactionId = 1; transactionId <= 2000; transactionId++) {
    // 70% chance to use common basket pattern, 30% random
    const usePattern = Math.random() < 0.7;
    let items: string[];
    
    if (usePattern) {
      const pattern = commonBaskets[Math.floor(Math.random() * commonBaskets.length)];
      items = [...pattern];
      // Add 0-3 random items
      const additionalCount = Math.floor(Math.random() * 4);
      for (let i = 0; i < additionalCount; i++) {
        const randomItem = products[Math.floor(Math.random() * products.length)];
        if (!items.includes(randomItem)) {
          items.push(randomItem);
        }
      }
    } else {
      // Random basket of 2-8 items
      const basketSize = 2 + Math.floor(Math.random() * 7);
      items = [];
      while (items.length < basketSize) {
        const randomItem = products[Math.floor(Math.random() * products.length)];
        if (!items.includes(randomItem)) {
          items.push(randomItem);
        }
      }
    }
    
    // Generate transaction date
    const daysAgo = Math.floor(Math.random() * 365);
    const transactionDate = new Date();
    transactionDate.setDate(transactionDate.getDate() - daysAgo);
    
    // Add each item as a row
    items.forEach(item => {
      data.push({
        transaction_id: `TXN_${String(transactionId).padStart(5, '0')}`,
        product: item,
        transaction_date: transactionDate.toISOString().split("T")[0],
        quantity: 1 + Math.floor(Math.random() * 3),
        price: parseFloat((5 + Math.random() * 25).toFixed(2)),
      });
    });
  }
  
  return data;
};

const MetricCard: React.FC<{ value: string | number; label: string; negative?: boolean; highlight?: boolean }> = ({ value, label, negative, highlight }) => (
  <div className={`text-center p-4 rounded-lg border ${negative ? 'border-destructive/30 bg-destructive/5' : highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
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
    a.download = 'basket_analysis_source_data.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length.toLocaleString()} rows × {columns.length} columns</Badge>
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
              Showing first 10 of {data.length.toLocaleString()} rows
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

const RuleCard: React.FC<{ rule: AssociationRule; rank: number }> = ({ rule, rank }) => {
  const getLiftColor = (lift: number) => {
    if (lift >= 3) return 'text-green-600';
    if (lift >= 2) return 'text-blue-600';
    if (lift >= 1.5) return 'text-primary';
    return 'text-muted-foreground';
  };
  
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/10 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">#{rank}</span>
          </div>
          <Badge variant="secondary" className={`text-xs ${getLiftColor(rule.lift)}`}>
            Lift: {rule.lift.toFixed(2)}
          </Badge>
        </div>
        <Badge variant="outline" className="text-xs">
          {(rule.confidence * 100).toFixed(1)}% confidence
        </Badge>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1">
          {rule.antecedents.map((item, i) => (
            <Badge key={i} variant="default" className="text-xs">{item}</Badge>
          ))}
        </div>
        <ArrowRight className="w-4 h-4 text-primary" />
        <div className="flex flex-wrap gap-1">
          {rule.consequents.map((item, i) => (
            <Badge key={i} variant="secondary" className="text-xs bg-primary/10">{item}</Badge>
          ))}
        </div>
      </div>
      
      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
        <span>Support: {(rule.support * 100).toFixed(2)}%</span>
        <span>Conviction: {rule.conviction === Infinity ? '∞' : rule.conviction.toFixed(2)}</span>
        <span>Leverage: {rule.leverage.toFixed(4)}</span>
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
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Market Basket Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Market Basket Analysis?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Market Basket Analysis is a data mining technique used to discover relationships between items purchased 
              together. It uses association rule mining algorithms to find patterns in transactional data, helping 
              businesses understand which products are frequently bought in combination. This insight enables optimized 
              product placement, cross-selling strategies, and targeted promotional campaigns.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Algorithms Used
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. Apriori Algorithm</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Classic algorithm for finding frequent itemsets and generating association rules<br/>
                  <strong>Method:</strong> Uses breadth-first search, generates candidate itemsets level-by-level<br/>
                  <strong>Principle:</strong> If an itemset is frequent, all its subsets must also be frequent (Apriori property)<br/>
                  <strong>Best for:</strong> Small to medium datasets, educational purposes, when interpretability is important
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. FP-Growth (Recommended)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Fast frequent pattern mining without candidate generation<br/>
                  <strong>Method:</strong> Builds FP-tree data structure, mines patterns using divide-and-conquer<br/>
                  <strong>Advantage:</strong> 10x+ faster than Apriori on large datasets, more memory efficient<br/>
                  <strong>Best for:</strong> Large datasets, production environments, when speed is critical
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. FP-Max</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Finds only maximal frequent itemsets (most specific patterns)<br/>
                  <strong>Method:</strong> Extension of FP-Growth that prunes non-maximal itemsets<br/>
                  <strong>Output:</strong> Smaller, more focused set of patterns<br/>
                  <strong>Best for:</strong> When you want the most specific patterns without redundancy
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
                <p className="font-medium text-sm">Support </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Frequency of itemset in the dataset<br/>
                  <strong>Formula:</strong> Support(A→B) = (Transactions containing A and B) / (Total transactions)<br/>
                  <strong>Example:</strong> 5% support means the combination appears in 5% of all transactions<br/>
                  <strong>Use:</strong> Filters out rare patterns, identifies common combinations
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Confidence </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Probability of consequent given antecedent<br/>
                  <strong>Formula:</strong> Confidence(A→B) = Support(A∩B) / Support(A)<br/>
                  <strong>Example:</strong> 70% confidence means 70% of customers who buy A also buy B<br/>
                  <strong>Use:</strong> Measures rule reliability, guides recommendation strength
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Lift </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> How much more likely B is purchased when A is purchased vs. randomly<br/>
                  <strong>Formula:</strong> Lift(A→B) = Confidence(A→B) / Support(B) = P(B|A) / P(B)<br/>
                  <strong>Interpretation:</strong> Lift {'>'}  1 (positive), Lift = 1 (independent), Lift {'<'}  1 (negative)<br/>
                  <strong>Use:</strong> Primary metric for finding interesting associations
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Conviction </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Measures dependency of rule, complement of confidence<br/>
                  <strong>Formula:</strong> Conviction(A→B) = (1 - Support(B)) / (1 - Confidence(A→B))<br/>
                  <strong>Range:</strong> 1 to ∞ (higher = stronger implication)<br/>
                  <strong>Use:</strong> Identifies rules where antecedent strongly implies consequent
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Leverage</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Difference between observed and expected co-occurrence<br/>
                  <strong>Formula:</strong> Leverage(A→B) = Support(A∩B) - Support(A) × Support(B)<br/>
                  <strong>Range:</strong> -0.25 to 0.25 (positive = association, negative = substitution)<br/>
                  <strong>Use:</strong> Measures statistical significance of association
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Interpretation Guidelines
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>High Lift (≥3):</strong> Very strong association—prioritize for promotions and bundling</p>
              <p>• <strong>Moderate Lift (1.5-3):</strong> Meaningful association—good for cross-selling and placement</p>
              <p>• <strong>Low Lift (1-1.5):</strong> Weak association—may not justify marketing investment</p>
              <p>• <strong>Negative Lift ({'<'}1):</strong> Items may be substitutes—consider competitive pricing</p>
              <p>• <strong>High Confidence + Low Support:</strong> Niche but reliable pattern—target specific segments</p>
              <p>• <strong>Low Confidence + High Support:</strong> Common but unreliable—may be trivial association</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Common Pitfalls & Limitations
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Correlation ≠ Causation:</strong> Rules show co-occurrence, not cause-and-effect relationships</p>
              <p>• <strong>Trivial Rules:</strong> May discover obvious patterns (e.g., hamburger buns + hamburgers)</p>
              <p>• <strong>Data Quality:</strong> Missing transactions, incomplete data, or errors can skew results significantly</p>
              <p>• <strong>Threshold Sensitivity:</strong> Results highly dependent on min_support and min_confidence settings</p>
              <p>• <strong>Computational Cost:</strong> Exponential growth with itemset size—careful with max_length parameter</p>
              <p>• <strong>Temporal Patterns:</strong> Static analysis misses time-based purchasing patterns and seasonality</p>
              <p>• <strong>Segment Differences:</strong> Overall patterns may hide important segment-specific associations</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Parameter Tuning Guide
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Minimum Support</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Too high: Miss rare but valuable patterns</li>
                  <li>• Too low: Too many rules, slow performance</li>
                  <li>• Recommendation: 0.5-5% for retail data</li>
                  <li>• Start high, gradually lower if needed</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Minimum Confidence</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Too high: Only extremely reliable rules</li>
                  <li>• Too low: Many unreliable recommendations</li>
                  <li>• Recommendation: 30-70% depending on use case</li>
                  <li>• Higher for automated recommendations</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Maximum Length</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 2-3 items: Most interpretable and actionable</li>
                  <li>• 4-5 items: More specific but rarer patterns</li>
                  <li>• 6+ items: Exponential computation cost</li>
                  <li>• Recommendation: Start with 3, increase if needed</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Algorithm Choice</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Apriori: {'<'}10K transactions, learning</li>
                  <li>• FP-Growth: 10K+ transactions, production</li>
                  <li>• FP-Max: When you want only maximal sets</li>
                  <li>• FP-Growth recommended for most cases</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Business Applications
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Cross-Selling & Upselling</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use high-lift rules to recommend complementary products. Implement "Frequently Bought Together" 
                  sections on e-commerce sites. Create product bundles based on strong associations. Target customers 
                  who bought A with offers for B.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Store Layout Optimization</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Place frequently associated items near each other to increase basket size. Create "impulse zones" 
                  near checkouts with high-confidence complementary items. Design store flow to encourage discovery 
                  of associated products.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Promotional Strategy</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Design "Buy A, Get B at discount" promotions using association rules. Create bundle deals with 
                  optimal pricing based on support and lift. Target email campaigns to customers based on their 
                  purchase history and discovered patterns.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Inventory Management</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Forecast demand for item B based on sales of associated item A. Ensure co-availability of strongly 
                  associated products. Optimize restocking schedules for items with high correlation. Adjust safety 
                  stock levels based on association strength.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Best Practices
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Data Preparation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Remove returns and cancelled transactions</li>
                  <li>• Exclude internal/test transactions</li>
                  <li>• Handle product hierarchy (category level?)</li>
                  <li>• Consider time windows (e.g., last 12 months)</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Validation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Review top rules for business logic</li>
                  <li>• Test recommendations with A/B testing</li>
                  <li>• Validate with domain experts</li>
                  <li>• Monitor performance metrics over time</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Implementation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Start with high-lift, high-support rules</li>
                  <li>• Pilot test before full rollout</li>
                  <li>• Measure incremental revenue impact</li>
                  <li>• Iterate based on results</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Ongoing Analysis</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Re-run analysis monthly or quarterly</li>
                  <li>• Track seasonal pattern changes</li>
                  <li>• Update rules based on new products</li>
                  <li>• Monitor rule effectiveness metrics</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Example Scenarios
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Grocery Store:</strong> Discover bread + milk + butter patterns for store layout and bundling</p>
              <p>• <strong>E-commerce:</strong> Power recommendation engines with "Customers also bought" features</p>
              <p>• <strong>Restaurants:</strong> Optimize menu item pairings and combo meal offerings</p>
              <p>• <strong>Electronics:</strong> Bundle accessories with main products (laptop + mouse + bag)</p>
              <p>• <strong>Fashion:</strong> Create outfit recommendations and cross-category promotions</p>
              <p>• <strong>Pharmacy:</strong> Identify complementary health products for cross-selling (within regulations)</p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Important:</strong> Association rules reveal patterns in past behavior 
              but don't explain why customers make these choices. Combine basket analysis with customer surveys, focus 
              groups, and qualitative research to understand underlying motivations. Always test rule-based strategies 
              with controlled experiments before scaling. What works in data may not always translate to effective 
              business strategies without proper implementation and customer experience design.
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
          <ShoppingCart className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Market Basket Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover hidden patterns in purchase behavior using association rule mining.
          Find which products are frequently bought together and optimize your cross-selling strategies.
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
            When to Use Market Basket Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Transaction ID column",
                  "Product/Item column",
                  "At least 100 transactions recommended",
                  "Multiple items per transaction",
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
                  "Association rules (If A → Then B)",
                  "Support, Confidence, Lift metrics",
                  "Frequent itemsets",
                  "Cross-selling recommendations",
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

export default function MarketBasketAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<BasketAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false); 

  // Configuration state
  const [transactionCol, setTransactionCol] = useState<string>("");
  const [itemCol, setItemCol] = useState<string>("");
  const [algorithm, setAlgorithm] = useState<string>("apriori");
  const [minSupport, setMinSupport] = useState<number>(0.01);
  const [minConfidence, setMinConfidence] = useState<number>(0.3);
  const [maxLength, setMaxLength] = useState<string>("3");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setTransactionCol("transaction_id");
    setItemCol("product");
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
    const uniqueTransactions = new Set(data.map(d => d[transactionCol])).size;
    const uniqueItems = new Set(data.map(d => d[itemCol])).size;
    const avgBasketSize = data.length / uniqueTransactions;
    
    const checks: ValidationCheck[] = [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length.toLocaleString()} rows loaded` : "No data loaded"
      },
      {
        name: "Transaction Column",
        passed: !!transactionCol,
        message: transactionCol ? `${uniqueTransactions.toLocaleString()} unique transactions` : "Select transaction column"
      },
      {
        name: "Item Column",
        passed: !!itemCol,
        message: itemCol ? `${uniqueItems.toLocaleString()} unique items` : "Select item column"
      },
      {
        name: "Sufficient Transactions",
        passed: uniqueTransactions >= 100,
        message: uniqueTransactions >= 500 ? `${uniqueTransactions} transactions (excellent)` :
                 uniqueTransactions >= 100 ? `${uniqueTransactions} transactions (acceptable)` :
                 `Only ${uniqueTransactions} transactions (need ≥100)`
      },
      {
        name: "Basket Size",
        passed: avgBasketSize >= 1.5,
        message: avgBasketSize >= 2 ? `Avg ${avgBasketSize.toFixed(1)} items/transaction (good)` :
                 avgBasketSize >= 1.5 ? `Avg ${avgBasketSize.toFixed(1)} items/transaction (acceptable)` :
                 `Avg ${avgBasketSize.toFixed(1)} items/transaction (need more items per transaction)`
      }
    ];
    
    return checks;
  }, [data, transactionCol, itemCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        transaction_col: transactionCol,
        item_col: itemCol,
        algorithm,
        min_support: minSupport,
        min_confidence: minConfidence,
        max_length: parseInt(maxLength),
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/basket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: BasketAnalysisResult = await res.json();
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
    const rules = results.results.association_rules;
    if (!rules.length) return;
    
    const headers = ['Antecedents', 'Consequents', 'Support', 'Confidence', 'Lift', 'Conviction', 'Leverage'];
    const rows = rules.map(r => [
      r.antecedents.join(' + '),
      r.consequents.join(' + '),
      r.support.toFixed(4),
      r.confidence.toFixed(4),
      r.lift.toFixed(4),
      r.conviction === Infinity ? 'Infinity' : r.conviction.toFixed(4),
      r.leverage.toFixed(6)
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'association_rules.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `basket_${chartKey}.png`;
    a.click();
  };

  const handleDownloadWord = async () => {
    if (!results) return;
    try {
      const res = await fetch(`/api/export/basket-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          results,
          algorithm,
          minSupport,
          minConfidence
        })
      });
      if (!res.ok) throw new Error("Report generation failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `basket_analysis_report_${new Date().toISOString().split('T')[0]}.docx`;
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
          Configure Basket Analysis
        </CardTitle>
        <CardDescription>Set up market basket analysis parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Algorithm Selection */}
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
        
        {/* Column Selection */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Required Columns
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transaction ID *</Label>
              <Select value={transactionCol || "__none__"} onValueChange={v => setTransactionCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Groups items into transactions/baskets</p>
            </div>
            <div className="space-y-2">
              <Label>Item/Product Column *</Label>
              <Select value={itemCol || "__none__"} onValueChange={v => setItemCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Product/item identifier</p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Threshold Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            Threshold Settings
          </h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Minimum Support</Label>
                <span className="text-sm font-mono text-primary">{(minSupport * 100).toFixed(1)}%</span>
              </div>
              <Slider
                value={[minSupport * 100]}
                onValueChange={(v) => setMinSupport(v[0] / 100)}
                min={0.1}
                max={10}
                step={0.1}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground">
                Minimum frequency for itemsets to be considered. Lower = more rules but slower.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Minimum Confidence</Label>
                <span className="text-sm font-mono text-primary">{(minConfidence * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[minConfidence * 100]}
                onValueChange={(v) => setMinConfidence(v[0] / 100)}
                min={10}
                max={90}
                step={5}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground">
                Minimum probability that consequent is purchased given antecedent.
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Maximum Itemset Length</Label>
              <Input
                type="number"
                min="2"
                max="6"
                value={maxLength}
                onChange={(e) => setMaxLength(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Maximum number of items in a rule</p>
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
                  {`Algorithm: ${ALGORITHM_TYPES.find(t => t.value === algorithm)?.label} • `}
                  {`Transaction: ${transactionCol} • Item: ${itemCol} • `}
                  {`Support: ${(minSupport * 100).toFixed(1)}% • Confidence: ${(minConfidence * 100).toFixed(0)}%`}
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
    const topRules = r.association_rules.slice(0, 5);
    const highLiftRules = r.association_rules.filter(rule => rule.lift >= 2).length;
    const strongRules = r.association_rules.filter(rule => rule.confidence >= 0.5).length;
    
    const finding = `${summary.total_rules.toLocaleString()} association rules were discovered from ${summary.total_transactions.toLocaleString()} transactions. ${highLiftRules > 0 ? `${highLiftRules} rules have lift ≥ 2, indicating strong positive associations.` : ''} ${strongRules > 0 ? `${strongRules} rules have confidence ≥ 50%, making them reliable for cross-selling recommendations.` : ''} The maximum lift value of ${r.metrics.max_lift.toFixed(2)} suggests meaningful patterns exist in your transaction data.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={summary.total_transactions.toLocaleString()} label="Transactions" highlight />
            <MetricCard value={r.metrics.unique_items} label="Unique Items" />
            <MetricCard value={summary.total_rules} label="Rules Found" />
            <MetricCard value={r.metrics.max_lift.toFixed(2)} label="Max Lift" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={r.metrics.avg_basket_size.toFixed(1)} label="Avg Basket Size" />
            <MetricCard value={`${(r.metrics.avg_confidence * 100).toFixed(1)}%`} label="Avg Confidence" />
            <MetricCard value={highLiftRules} label="High Lift Rules (≥2)" highlight={highLiftRules > 5} />
            <MetricCard value={strongRules} label="Strong Rules (≥50%)" />
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              Top Association Rules (by Lift)
            </h4>
            <div className="space-y-3">
              {topRules.map((rule, idx) => (
                <RuleCard key={idx} rule={rule} rank={idx + 1} />
              ))}
            </div>
          </div>
          
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
                {insight.status === "positive" ? (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                ) : insight.status === "warning" ? (
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
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
            detail={`This analysis used the ${ALGORITHM_TYPES.find(t => t.value === algorithm)?.label} algorithm to discover association rules from ${summary.total_transactions.toLocaleString()} transactions containing ${r.metrics.unique_items} unique items.

■ Association Rule Mining Overview
Association rule mining is a fundamental technique for discovering relationships between items in transactional data. The goal is to find rules of the form "If customers buy A, they are likely to also buy B."

• What are Association Rules?
  - Rules follow the format: {Antecedent} → {Consequent}
  - Example: {Bread, Butter} → {Milk} means customers who buy bread and butter often also buy milk
  - Rules are evaluated using Support, Confidence, and Lift metrics

• Key Metrics Explained:
  - Support: How frequently the itemset appears in the data
  - Confidence: How often the rule is correct (P(B|A))
  - Lift: How much more likely B is given A, compared to baseline

• Current Configuration:
  - Minimum Support: ${(minSupport * 100).toFixed(1)}% (itemsets appearing in at least ${(minSupport * summary.total_transactions).toFixed(0)} transactions)
  - Minimum Confidence: ${(minConfidence * 100).toFixed(0)}% (rules correct at least ${(minConfidence * 100).toFixed(0)}% of the time)
  - Maximum Itemset Length: ${maxLength} items

■ Results Interpretation
${summary.total_rules} rules were discovered that meet the threshold criteria.

• Lift Distribution:
  - ${r.association_rules.filter(r => r.lift >= 3).length} rules with Lift ≥ 3 (very strong association)
  - ${r.association_rules.filter(r => r.lift >= 2 && r.lift < 3).length} rules with Lift 2-3 (strong association)
  - ${r.association_rules.filter(r => r.lift >= 1.5 && r.lift < 2).length} rules with Lift 1.5-2 (moderate association)
  - ${r.association_rules.filter(r => r.lift >= 1 && r.lift < 1.5).length} rules with Lift 1-1.5 (weak association)

• Confidence Distribution:
  - ${r.association_rules.filter(r => r.confidence >= 0.7).length} rules with ≥70% confidence (highly reliable)
  - ${r.association_rules.filter(r => r.confidence >= 0.5 && r.confidence < 0.7).length} rules with 50-70% confidence (reliable)
  - ${r.association_rules.filter(r => r.confidence < 0.5).length} rules with <50% confidence (moderate reliability)

The top rule "${topRules[0]?.antecedents.join(' + ')} → ${topRules[0]?.consequents.join(' + ')}" has a lift of ${topRules[0]?.lift.toFixed(2)}, meaning customers who buy the antecedent items are ${topRules[0]?.lift.toFixed(1)}x more likely to buy the consequent items compared to random chance.`}
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

  // Step 5: Why (Understanding)
  const renderStep5Why = () => {
    if (!results) return null;
    
    const { results: r } = results;
    const topRules = r.association_rules.slice(0, 10);
    
    const metricExplanations = [
      {
        num: 1,
        title: "Support (지지도)",
        content: `Support measures how frequently an itemset appears in the dataset. It is calculated as: Support(A→B) = P(A∩B) = (Transactions containing both A and B) / (Total transactions). A rule with 5% support means the combination appears in 5% of all transactions. Higher support indicates a more common pattern.`
      },
      {
        num: 2,
        title: "Confidence (신뢰도)",
        content: `Confidence measures how often the rule is correct. It is calculated as: Confidence(A→B) = P(B|A) = Support(A∩B) / Support(A). A rule with 70% confidence means that 70% of transactions containing A also contain B. Higher confidence indicates a more reliable rule.`
      },
      {
        num: 3,
        title: "Lift (향상도)",
        content: `Lift measures how much more likely B is purchased when A is purchased, compared to B being purchased randomly. Lift(A→B) = Confidence(A→B) / Support(B) = P(B|A) / P(B). Lift > 1 indicates positive association (A increases B's likelihood). Lift = 1 indicates independence. Lift < 1 indicates negative association.`
      },
      {
        num: 4,
        title: "Conviction & Leverage",
        content: `Conviction measures rule dependency: Conviction(A→B) = (1 - Support(B)) / (1 - Confidence(A→B)). Higher conviction indicates stronger implication (∞ when confidence = 100%). Leverage measures the difference between observed and expected co-occurrence: Leverage(A→B) = Support(A∩B) - Support(A)×Support(B). Positive leverage indicates positive association.`
      },
    ];

    const actionStrategies: { [key: string]: { description: string; tactics: string[] } } = {
      'cross_selling': {
        description: 'Place associated products near each other to increase basket size',
        tactics: ['In-store product placement', 'Online "Frequently bought together"', 'Bundle promotions', 'Checkout recommendations']
      },
      'promotional': {
        description: 'Use high-lift rules for targeted promotions',
        tactics: ['BOGO offers on associated items', 'Discount on B when A is purchased', 'Loyalty point multipliers', 'Email recommendations']
      },
      'inventory': {
        description: 'Optimize inventory based on co-purchase patterns',
        tactics: ['Joint demand forecasting', 'Synchronized restocking', 'Safety stock adjustment', 'Seasonal pattern analysis']
      },
      'pricing': {
        description: 'Strategic pricing leveraging item relationships',
        tactics: ['Loss leader pricing', 'Bundle pricing strategy', 'Dynamic pricing', 'Complementary product margins']
      },
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5 text-primary" />
            Understanding the Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={`Association rule mining reveals hidden patterns in purchase behavior. The metrics (Support, Confidence, Lift) help evaluate rule quality and identify actionable insights for cross-selling, promotions, and inventory optimization.`} />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Metrics Explained</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {metricExplanations.map((exp) => (
                <div key={exp.num} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                      {exp.num}
                    </div>
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
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">How to Use These Rules</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(actionStrategies).map(([key, strategy]) => (
                <div key={key} className="p-4 rounded-lg border border-border bg-muted/10">
                  <h5 className="font-medium text-sm capitalize mb-2">{key.replace('_', ' ')}</h5>
                  <p className="text-xs text-muted-foreground mb-3">{strategy.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {strategy.tactics.map(tactic => (
                      <Badge key={tactic} variant="outline" className="text-xs">{tactic}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Top Rules Interpretation</h4>
            <div className="space-y-4">
              {topRules.slice(0, 5).map((rule, idx) => {
                const isStrongLift = rule.lift >= 2;
                const isHighConfidence = rule.confidence >= 0.5;
                
                return (
                  <div key={idx} className={`p-4 rounded-lg border ${isStrongLift && isHighConfidence ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/10'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={isStrongLift ? "default" : "secondary"} className="text-xs">
                        #{idx + 1}
                      </Badge>
                      {isStrongLift && isHighConfidence && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                          <Star className="w-3 h-3 mr-1" /> Recommended
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="font-medium">{rule.antecedents.join(' + ')}</span>
                      <ArrowRight className="w-4 h-4 text-primary" />
                      <span className="font-medium text-primary">{rule.consequents.join(' + ')}</span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {`Customers who buy ${rule.antecedents.join(' and ')} are ${rule.lift.toFixed(1)}x more likely to also buy ${rule.consequents.join(' and ')}. This pattern appears in ${(rule.support * 100).toFixed(2)}% of transactions with ${(rule.confidence * 100).toFixed(1)}% confidence.`}
                    </p>
                    
                    <div className="text-xs text-muted-foreground">
                      <strong>Business Implication: </strong>
                      {rule.lift >= 3
                        ? `Very strong association. Place these items together and create bundle promotions.`
                        : rule.lift >= 2
                          ? `Strong association. Consider "Frequently bought together" recommendations and proximity placement.`
                          : rule.lift >= 1.5
                            ? `Moderate association. Worth testing in targeted promotions.`
                            : `Weak association. May not justify dedicated marketing efforts.`
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <DetailParagraph
            title="Strategic Recommendations"
            detail={`Based on the discovered association rules, here are detailed strategic recommendations for different business functions.

■ 1. Cross-Selling Strategy

【Product Placement (In-Store)】
Rules with high lift (≥2) and high support (≥1%) are ideal candidates for product placement optimization.
• Place high-lift rule items in adjacent aisles or shelves
• Create "impulse purchase" zones near checkout with frequently associated items
• Design store layouts that encourage natural discovery of associated products

【Online Recommendations】
• Implement "Frequently Bought Together" sections using top lift rules
• Show "Customers Also Bought" recommendations on product pages
• Use cart-based recommendations: when A is in cart, suggest B
• Personalize recommendations based on browsing history and discovered rules

【Bundle Strategy】
• Create value bundles from high-confidence rules (≥60%)
• Price bundles at 5-15% discount vs. individual items
• Test "Complete the Set" promotions for strong associations

■ 2. Promotional Campaign Design

【Targeted Promotions】
• Use high-lift rules for "Buy A, Get X% off B" promotions
• BOGO (Buy One Get One) offers on strongly associated items
• Loyalty point multipliers when associated items are purchased together

【Email Marketing】
• Segment customers by past purchases of antecedent items
• Send personalized recommendations for consequent items
• A/B test rule-based recommendations vs. random recommendations

【Pricing Strategy】
• Consider "loss leader" pricing on high-support antecedent items
• Maintain margins on consequent items with inelastic demand
• Dynamic pricing based on basket composition

■ 3. Inventory Management

【Demand Forecasting】
• Strong rules indicate joint demand patterns
• When forecasting demand for item B, consider sales of associated item A
• Account for promotional lift when running association-based campaigns

【Stock Management】
• Ensure co-availability of strongly associated items
• Synchronized restocking schedules for associated products
• Safety stock adjustments based on correlation strength

■ 4. Measurement Framework

【KPIs to Track】
• Average basket size (items per transaction)
• Cross-sell conversion rate (% of A buyers who also buy B)
• Bundle uptake rate
• Revenue per transaction
• Rule-based recommendation click-through rate

【A/B Testing Framework】
• Test rule-based recommendations vs. popularity-based
• Test bundle pricing vs. individual pricing
• Test product placement changes based on rules
• Measure incremental revenue from rule-based strategies

【Re-Analysis Frequency】
• Monthly: Review top rules and adjust promotions
• Quarterly: Full re-analysis to discover new patterns
• Seasonally: Analyze seasonal variations in associations
• Post-campaign: Measure impact and refine strategies

■ 5. Important Considerations

【Rule Quality Assessment】
• High Lift + Low Support: Niche but strong pattern (good for targeted marketing)
• Low Lift + High Support: Common but weak pattern (less actionable)
• High Lift + High Support: Ideal candidates for major initiatives
• Always validate rules with domain knowledge before implementation

【Potential Pitfalls】
• Correlation ≠ Causation: Rules show co-occurrence, not cause-effect
• Trivial associations: Some patterns may be obvious (hot dogs + buns)
• Simpson's Paradox: Overall patterns may differ from segment-specific ones
• Data quality: Missing transactions or items can skew results

【Advanced Applications】
• Sequential pattern mining: Order of purchases matters
• Time-based associations: Patterns that emerge over customer lifetime
• Cross-category analysis: Associations between product categories
• Customer segment-specific rules: Different patterns for different customer groups`}
          />
          
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

  // Step 6: Full Report
  const renderStep6Report = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights, visualizations } = results;
    const rules = r.association_rules;
    const sortedByLift = [...rules].sort((a, b) => b.lift - a.lift);
    const sortedByConfidence = [...rules].sort((a, b) => b.confidence - a.confidence);
    const sortedBySupport = [...rules].sort((a, b) => b.support - a.support);
    
    // Get top items by frequency
    const topItems = Object.entries(r.item_frequencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Market Basket Analysis Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ALGORITHM_TYPES.find(t => t.value === algorithm)?.label} | {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={summary.total_transactions.toLocaleString()} label="Transactions" highlight />
              <MetricCard value={r.metrics.unique_items} label="Unique Items" />
              <MetricCard value={summary.total_rules} label="Rules Discovered" />
              <MetricCard value={r.metrics.max_lift.toFixed(2)} label="Max Lift" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {ALGORITHM_TYPES.find(t => t.value === summary.algorithm)?.label} was applied to analyze
              {' '}{summary.total_transactions.toLocaleString()} transactions with minimum support of
              {' '}{(summary.min_support * 100).toFixed(1)}% and minimum confidence of {(summary.min_confidence * 100).toFixed(0)}%.
              {' '}{summary.total_rules} association rules were discovered, with an average basket size of
              {' '}{r.metrics.avg_basket_size.toFixed(1)} items per transaction.
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
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  ins.status === "warning" ? "border-destructive/30 bg-destructive/5" :
                  ins.status === "positive" ? "border-primary/30 bg-primary/5" :
                  "border-border bg-muted/10"
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
        
        {/* Top Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Most Frequent Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {topItems.map(([item, count], idx) => (
                <div key={item} className="p-3 rounded-lg border border-border bg-muted/10 text-center">
                  <div className="text-xs text-muted-foreground mb-1">#{idx + 1}</div>
                  <p className="font-medium text-sm truncate" title={item}>{item}</p>
                  <p className="text-xs text-muted-foreground mt-1">{count.toLocaleString()} txns</p>
                </div>
              ))}
            </div>
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
                  {visualizations.item_frequency && <TabsTrigger value="item_frequency" className="text-xs">Item Frequency</TabsTrigger>}
                  {visualizations.support_confidence && <TabsTrigger value="support_confidence" className="text-xs">Support vs Confidence</TabsTrigger>}
                  {visualizations.lift_matrix && <TabsTrigger value="lift_matrix" className="text-xs">Lift Matrix</TabsTrigger>}
                  {visualizations.rule_network && <TabsTrigger value="rule_network" className="text-xs">Rule Network</TabsTrigger>}
                  {visualizations.itemset_treemap && <TabsTrigger value="itemset_treemap" className="text-xs">Itemset Treemap</TabsTrigger>}
                </TabsList>
                {Object.entries(visualizations).map(([key, value]) => value && (
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
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}
        
        {/* Association Rules Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Association Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="by_lift">
              <TabsList className="mb-4">
                <TabsTrigger value="by_lift" className="text-xs">By Lift</TabsTrigger>
                <TabsTrigger value="by_confidence" className="text-xs">By Confidence</TabsTrigger>
                <TabsTrigger value="by_support" className="text-xs">By Support</TabsTrigger>
              </TabsList>
              
              <TabsContent value="by_lift">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Antecedent</TableHead>
                      <TableHead className="w-12 text-center">→</TableHead>
                      <TableHead>Consequent</TableHead>
                      <TableHead className="text-right">Support</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead className="text-right">Lift</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedByLift.slice(0, 20).map((rule, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell>{rule.antecedents.join(' + ')}</TableCell>
                        <TableCell className="text-center"><ArrowRight className="w-4 h-4 mx-auto text-muted-foreground" /></TableCell>
                        <TableCell>{rule.consequents.join(' + ')}</TableCell>
                        <TableCell className="text-right">{(rule.support * 100).toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{(rule.confidence * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-right font-medium">{rule.lift.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              
              <TabsContent value="by_confidence">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Antecedent</TableHead>
                      <TableHead className="w-12 text-center">→</TableHead>
                      <TableHead>Consequent</TableHead>
                      <TableHead className="text-right">Support</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead className="text-right">Lift</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedByConfidence.slice(0, 20).map((rule, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell>{rule.antecedents.join(' + ')}</TableCell>
                        <TableCell className="text-center"><ArrowRight className="w-4 h-4 mx-auto text-muted-foreground" /></TableCell>
                        <TableCell>{rule.consequents.join(' + ')}</TableCell>
                        <TableCell className="text-right">{(rule.support * 100).toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-medium">{(rule.confidence * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{rule.lift.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              
              <TabsContent value="by_support">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Antecedent</TableHead>
                      <TableHead className="w-12 text-center">→</TableHead>
                      <TableHead>Consequent</TableHead>
                      <TableHead className="text-right">Support</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead className="text-right">Lift</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBySupport.slice(0, 20).map((rule, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell>{rule.antecedents.join(' + ')}</TableCell>
                        <TableCell className="text-center"><ArrowRight className="w-4 h-4 mx-auto text-muted-foreground" /></TableCell>
                        <TableCell>{rule.consequents.join(' + ')}</TableCell>
                        <TableCell className="text-right font-medium">{(rule.support * 100).toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{(rule.confidence * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{rule.lift.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
            
            {rules.length > 20 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Showing top 20 of {rules.length.toLocaleString()} rules
              </p>
            )}
            
            <DetailParagraph
              title="Association Rules Interpretation Guide"
              detail={`This table displays the discovered association rules sorted by different metrics. Understanding how to interpret these rules is crucial for effective business application.

■ Table Columns Explained

【Antecedent (If)】
The items that trigger the rule. These are the items a customer has already added to their basket.
• Single item: Simple rule like "Bread → Butter"
• Multiple items: Complex rule like "Bread + Butter → Milk"
• More items in antecedent = more specific but potentially more useful

【Consequent (Then)】
The items that are likely to be purchased given the antecedent items.
• Target items for cross-selling recommendations
• Products to place near antecedent items
• Items to suggest in "You may also like" sections

【Support】
The percentage of transactions containing both antecedent and consequent.
• Higher support = More common pattern
• Low support + High lift = Niche opportunity
• Consider absolute transaction count for business significance

【Confidence】
The probability that consequent is purchased given antecedent.
• ≥70%: Very reliable for recommendations
• 50-70%: Good for promotional campaigns
• 30-50%: Use with caution, test before scaling
• <30%: May not justify dedicated marketing effort

【Lift】
How much more likely consequent is given antecedent vs. random chance.
• ≥3.0: Very strong association → Priority action
• 2.0-3.0: Strong association → Good candidates
• 1.5-2.0: Moderate association → Worth testing
• 1.0-1.5: Weak association → Low priority
• <1.0: Negative association → Items may be substitutes

■ How to Use Each Sorting Option

【By Lift (Default)】
Best for: Finding the strongest associations regardless of frequency
Use case: Targeted marketing, niche segment strategies, personalized recommendations
Caution: High-lift rules may have low support (rare but strong patterns)

【By Confidence】
Best for: Finding the most reliable rules for recommendations
Use case: Building recommendation engines, creating reliable bundles
Caution: May miss interesting patterns with lower confidence but high lift

【By Support】
Best for: Finding the most common purchase patterns
Use case: Store layout optimization, inventory planning, mass marketing
Caution: High-support rules may be obvious (e.g., staple items bought together)

■ Actionable Insights Matrix

【High Lift + High Support + High Confidence】
→ Top priority - implement immediately
   Strongest patterns with broad impact

【High Lift + Low Support + High Confidence】
→ Targeted campaigns for niche segments
   Reliable but rare patterns for specific groups

【High Lift + High Support + Low Confidence】
→ Product placement optimization
   Common associations worth testing

【Low Lift + High Support + High Confidence】
→ Review for trivial associations
   May be obvious patterns (e.g., related basics)

【High Lift + Low Support + Low Confidence】
→ Test with A/B experiments
   Interesting but unproven patterns

■ Reading the Results

When reviewing rules, consider:
1. Business relevance: Does the association make sense logically?
2. Actionability: Can you implement changes based on this rule?
3. Incremental value: Is this pattern something you're not already leveraging?
4. Margin impact: What's the profitability of consequent items?
5. Seasonality: Does this pattern hold across different time periods?

The most valuable rules are those that are non-obvious yet actionable, with sufficient support to impact business metrics meaningfully.`}
            />
          </CardContent>
        </Card>
        
        {/* Frequent Itemsets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Frequent Itemsets</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Itemset</TableHead>
                  <TableHead className="text-right">Support</TableHead>
                  <TableHead className="text-right">Length</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.frequent_itemsets.slice(0, 15).map((itemset, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {itemset.itemsets.map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{(itemset.support * 100).toFixed(2)}%</TableCell>
                    <TableCell className="text-right">{itemset.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {r.frequent_itemsets.length > 15 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Showing top 15 of {r.frequent_itemsets.length.toLocaleString()} itemsets
              </p>
            )}
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
                CSV (All Rules)
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
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Analysis</Button>
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

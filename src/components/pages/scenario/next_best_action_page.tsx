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
  ChevronRight, ShoppingCart, Target, Lightbulb, AlertTriangle,
  BookMarked, BarChart3, Users, Sparkles, TrendingUp, Package
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface NBAResult {
  success: boolean;
  results: {
    metrics: {
      total_customers: number;
      total_products: number;
      total_transactions: number;
      avg_basket_size: number;
      total_rules: number;
      coverage_rate: number;
      customers_with_recommendations: number;
    };
    product_stats: {
      [key: string]: {
        purchase_count: number;
        purchase_rate: number;
        customers: number;
      };
    };
    top_rules: Array<{
      if_bought: string[];
      then_recommend: string[];
      confidence: number;
      lift: number;
      support: number;
    }>;
    customer_recommendations: Array<{
      [key: string]: any;
      purchased_products: string[];
      basket_size: number;
      recommendations: Array<{
        product: string;
        confidence: number;
        lift: number;
      }>;
      recommendation_count: number;
    }>;
    top_recommendations: Array<{
      product: string;
      frequency: number;
    }>;
  };
  visualizations: {
    product_popularity?: string;
    basket_distribution?: string;
    association_rules?: string;
    coverage_and_recommendations?: string;
    confidence_lift_scatter?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    total_customers: number;
    coverage_rate: number;
    total_rules: number;
  };
}

const generateSampleData = (): DataRow[] => {
  const products = ['Product_A', 'Product_B', 'Product_C', 'Product_D', 'Product_E', 'Product_F'];
  const data: DataRow[] = [];
  
  for (let i = 1; i <= 150; i++) {
    const customerType = Math.random();
    const row: DataRow = {
      customer_id: `CUST_${String(i).padStart(4, '0')}`
    };
    
    if (customerType < 0.25) {
      products.forEach(p => {
        row[p] = Math.random() < 0.6 ? 1 : 0;
      });
    } else if (customerType < 0.60) {
      products.forEach(p => {
        row[p] = Math.random() < 0.35 ? 1 : 0;
      });
    } else {
      products.forEach(p => {
        row[p] = Math.random() < 0.20 ? 1 : 0;
      });
    }
    
    data.push(row);
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
    a.download = 'nba_data.csv';
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
                {columns.slice(0, 8).map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 10).map((row, i) => (
                <TableRow key={i}>
                  {columns.slice(0, 8).map(col => (
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
            <h2 className="text-lg font-semibold">Next Best Action Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Next Best Action?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Next Best Action uses association rules mining (market basket analysis) to discover which products 
              are frequently bought together. By analyzing purchase patterns, it generates personalized cross-sell 
              recommendations that increase basket size, customer lifetime value, and revenue per transaction. 
              This approach moves beyond intuition to data-driven product bundling and recommendation strategies.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Algorithm: Apriori for Association Rules Mining
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. Frequent Itemset Generation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Identify products frequently purchased together<br/>
                  <strong>Method:</strong> Scans transactions to find item combinations meeting minimum support threshold (5%)<br/>
                  <strong>Process:</strong> Starts with individual items → 2-item pairs → 3-item sets → etc.<br/>
                  <strong>Output:</strong> List of frequent product combinations (itemsets)
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. Association Rule Generation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Create "If-Then" recommendations from frequent itemsets<br/>
                  <strong>Method:</strong> For each itemset, generates rules like "If Product A → Then Product B"<br/>
                  <strong>Filter:</strong> Only keeps rules with confidence ≥ 30%<br/>
                  <strong>Output:</strong> Actionable cross-sell rules with metrics (support, confidence, lift)
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. Personalized Recommendations</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Process:</strong> For each customer, match their purchases to rule antecedents (if-bought)<br/>
                  <strong>Filtering:</strong> Exclude products already purchased<br/>
                  <strong>Ranking:</strong> Sort by confidence score (purchase probability)<br/>
                  <strong>Output:</strong> Top 3 personalized product recommendations per customer
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
                <p className="font-medium text-sm">Support</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Formula:</strong> Support(A,B) = Count(A AND B) / Total Transactions<br/>
                  <strong>Meaning:</strong> What % of customers bought products A and B together?<br/>
                  <strong>Example:</strong> 10% support means 10% of all customer baskets contain this product pair<br/>
                  <strong>Threshold:</strong> Minimum 5% support ensures statistical reliability
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Confidence</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Formula:</strong> Confidence(A→B) = Support(A,B) / Support(A)<br/>
                  <strong>Meaning:</strong> If customer bought A, what's the probability they also bought B?<br/>
                  <strong>Example:</strong> 70% confidence means 7 out of 10 customers who bought A also bought B<br/>
                  <strong>Use:</strong> Primary metric for recommendation strength—higher confidence = better recommendation
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Lift</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Formula:</strong> Lift(A→B) = Confidence(A→B) / Support(B)<br/>
                  <strong>Meaning:</strong> How much more likely is B purchased with A vs. B purchased alone?<br/>
                  <strong>Interpretation:</strong><br/>
                  • Lift = 1.0: No association (A and B are independent)<br/>
                  • Lift {'>'} 1.0: Positive association (A increases likelihood of B)<br/>
                  • Lift ≥ 2.0: Strong cross-sell opportunity (B is 2x more likely with A)<br/>
                  <strong>Use:</strong> Identifies strongest product affinities for bundling and promotions
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Coverage Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Formula:</strong> (Customers with Recommendations / Total Customers) × 100%<br/>
                  <strong>Meaning:</strong> What % of customers received personalized recommendations?<br/>
                  <strong>Target:</strong> 70%+ coverage enables broad cross-sell deployment<br/>
                  <strong>Low Coverage:</strong> Indicates single-product purchases or insufficient purchase history
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
              <p><strong>High Lift (≥2.0) + High Confidence (≥50%):</strong> Premium cross-sell opportunity—create bundles, feature prominently</p>
              <p><strong>High Lift (≥2.0) + Moderate Confidence (30-50%):</strong> Strong affinity but lower frequency—good for targeted email campaigns</p>
              <p><strong>Moderate Lift (1.5-2.0) + High Confidence:</strong> Reliable cross-sell—implement in recommendations, test bundle discounts</p>
              <p><strong>Low Lift ({'<'}1.5):</strong> Weak or no association—use only as fallback recommendations or investigate if products compete</p>
              <p><strong>High Support (≥10%):</strong> Popular combination—reliable for broad deployment across all channels</p>
              <p><strong>Low Support ({'<'}5%):</strong> Niche combination—may work for specific customer segments but less reliable</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Business Applications
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Product Pages</p>
                <p className="text-xs text-muted-foreground">
                  Display "Frequently Bought Together" based on high-lift rules. Add one-click bundle purchase with discount.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Checkout Upsells</p>
                <p className="text-xs text-muted-foreground">
                  Show relevant add-ons before payment: "Complete your purchase with [Product]" based on cart contents.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Email Campaigns</p>
                <p className="text-xs text-muted-foreground">
                  Triggered emails to past buyers: "You bought [A], customers also love [B]" with personalized recommendations.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Bundle Promotions</p>
                <p className="text-xs text-muted-foreground">
                  Create "Buy Together & Save" bundles for lift ≥ 2.0 pairs with 10-15% discount vs individual pricing.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Store Layout</p>
                <p className="text-xs text-muted-foreground">
                  Physical retail: Position frequently co-purchased items near each other to encourage impulse bundling.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Search Results</p>
                <p className="text-xs text-muted-foreground">
                  When customer searches for [A], prominently feature complementary products based on association rules.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Common Pitfalls & How to Avoid
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Obvious Pairs:</strong> Rules like "left shoe → right shoe" are not actionable. Filter out product variants of same item.</p>
              <p>• <strong>Competing Products:</strong> Lift {'<'} 1.0 may indicate substitutes (red vs blue shirt). Don't cross-sell competitors.</p>
              <p>• <strong>Low-Volume Products:</strong> New/niche items may lack data. Supplement with content-based or collaborative filtering.</p>
              <p>• <strong>Seasonal Changes:</strong> Purchase patterns shift (winter coats in summer). Re-run analysis quarterly or by season.</p>
              <p>• <strong>Price Sensitivity:</strong> High-priced items may have low support. Segment by price tier for better rules.</p>
              <p>• <strong>Ignoring Context:</strong> Bundle recommendations should make logical sense—validate with domain knowledge.</p>
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
                  <li>• Use binary columns (0/1) for purchased items</li>
                  <li>• Ensure consistent product naming</li>
                  <li>• Remove test/internal transactions</li>
                  <li>• Clean duplicate customer records</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Parameter Tuning</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Start with 5% min support, 30% confidence</li>
                  <li>• Lower support for niche/new products</li>
                  <li>• Focus on lift ≥ 1.5 for actionable rules</li>
                  <li>• Limit to 3-20 products for clarity</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Implementation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• A/B test recommendations vs control</li>
                  <li>• Track CTR, conversion, AOV lift</li>
                  <li>• Start with top 5 high-lift rules</li>
                  <li>• Deploy gradually: PDP → Checkout → Email</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Continuous Improvement</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Re-run analysis monthly</li>
                  <li>• Remove rules with {'<'}1% CTR</li>
                  <li>• Add new product launches to data</li>
                  <li>• Monitor for lift decay over time</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> This analysis uses mlxtend's Apriori algorithm for association 
              rules mining. Results show correlations in purchase behavior—always validate recommendations with business logic. 
              Association does not imply causation. Some product pairings may be coincidental rather than causal.
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
          <ShoppingCart className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Next Best Action</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate personalized product recommendations using association rules mining. Discover which products 
          are frequently bought together and create data-driven cross-sell strategies.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Association Rules</p>
              <p className="text-xs text-muted-foreground">Market basket analysis</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Cross-Sell Insights</p>
              <p className="text-xs text-muted-foreground">Product bundles</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Revenue Optimization</p>
              <p className="text-xs text-muted-foreground">Increase AOV</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use Next Best Action
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Customer ID column",
                  "Product purchase columns (binary 0/1)",
                  "50+ customers with purchase history",
                  "3-20 products in catalog",
                  "Mix of single and multi-item baskets"
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
                  "Personalized product recommendations",
                  "Cross-sell rules with confidence scores",
                  "Product bundling opportunities",
                  "Customer-specific next purchases",
                  "Association strength metrics (lift)"
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
export default function NextBestActionPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<NBAResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const [customerIdCol, setCustomerIdCol] = useState<string>("");
  const [productCols, setProductCols] = useState<string[]>([]);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    setCustomerIdCol("customer_id");
    setProductCols(["Product_A", "Product_B", "Product_C", "Product_D", "Product_E", "Product_F"]);
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

  const handleToggleProduct = useCallback((product: string) => {
    setProductCols(prev => 
      prev.includes(product) 
        ? prev.filter(p => p !== product)
        : [...prev, product]
    );
  }, []);

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    return [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length.toLocaleString()} customers loaded` : "No data loaded"
      },
      {
        name: "Customer ID Column",
        passed: !!customerIdCol,
        message: customerIdCol ? `Using: ${customerIdCol}` : "Select customer ID column"
      },
      {
        name: "Product Columns",
        passed: productCols.length >= 3,
        message: productCols.length >= 3
          ? `${productCols.length} products selected`
          : productCols.length > 0
          ? `Only ${productCols.length} products (need ≥3)`
          : "Select at least 3 product columns"
      },
      {
        name: "Sufficient Data",
        passed: data.length >= 10,
        message: data.length >= 50
          ? `${data.length} customers (excellent)`
          : data.length >= 10
          ? `${data.length} customers (acceptable)`
          : `Only ${data.length} customers (need ≥10)`
      }
    ];
  }, [data, customerIdCol, productCols]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        customer_id_col: customerIdCol,
        product_cols: productCols
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/next-best-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: NBAResult = await res.json();
      setResults(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Analysis Parameters
        </CardTitle>
        <CardDescription>Select customer ID and product purchase columns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
          <Label>Product Purchase Columns (select 3-20) *</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-3 border border-border rounded-lg">
            {columns.filter(col => col !== customerIdCol).map((col) => (
              <label key={col} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={productCols.includes(col)}
                  onChange={() => handleToggleProduct(col)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{col}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {productCols.length} products selected. Binary columns (0/1) indicating purchase.
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
    const finding = `Market basket analysis identified ${metrics.total_rules} cross-sell patterns from ${summary.total_customers.toLocaleString()} customers. ${metrics.customers_with_recommendations} customers (${metrics.coverage_rate.toFixed(1)}%) received recommendations.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Next Best Action Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={summary.total_customers.toLocaleString()} label="Customers" icon={Users} highlight />
            <MetricCard value={metrics.total_rules} label="Rules" icon={BarChart3} />
            <MetricCard value={`${metrics.coverage_rate.toFixed(1)}%`} label="Coverage" icon={Target} />
            <MetricCard value={metrics.avg_basket_size.toFixed(1)} label="Basket Size" icon={ShoppingCart} />
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Top 5 Cross-Sell Rules</h4>
            <div className="space-y-2">
              {r.top_rules.slice(0, 5).map((rule, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">
                      If: {rule.if_bought.join(', ')} → Then: {rule.then_recommend.join(', ')}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      Lift: {rule.lift.toFixed(2)}x
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <p>Confidence</p>
                      <p className="font-semibold text-foreground">{(rule.confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p>Support</p>
                      <p className="font-semibold text-foreground">{(rule.support * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p>Lift</p>
                      <p className="font-semibold text-foreground">{rule.lift.toFixed(2)}x</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  insight.status === "positive" ? "border-primary/30 bg-primary/5" : 
                  insight.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/10"
                }`}>
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
            detail={`This Next Best Action analysis uses association rules mining (Apriori algorithm) to discover product purchase patterns and generate personalized cross-sell recommendations.

■ Total Association Rules: ${metrics.total_rules}
${metrics.total_rules >= 20 
  ? `Excellent pattern discovery. ${metrics.total_rules} rules provide comprehensive cross-sell opportunities across product catalog. Strong bundling potential indicates diverse purchase behavior and multiple recommendation paths.`
  : metrics.total_rules >= 10
  ? `Good pattern discovery. ${metrics.total_rules} rules offer solid cross-sell foundation. Consider expanding product catalog or analyzing different customer segments for additional patterns.`
  : `Limited pattern discovery. ${metrics.total_rules} rules suggest sparse purchase data or highly independent products. Investigate: (1) Is data sufficient? (2) Are products complementary? (3) Should minimum support threshold be lowered?`}

■ Recommendation Coverage: ${metrics.coverage_rate.toFixed(1)}%
${metrics.customers_with_recommendations} out of ${metrics.total_customers} customers received personalized recommendations based on their purchase history. ${
  metrics.coverage_rate >= 70
    ? `High coverage indicates robust cross-sell strategy can be deployed broadly. Most customers have actionable next best actions, enabling systematic recommendation deployment across product pages, checkout, and email campaigns.`
    : metrics.coverage_rate >= 50
    ? `Moderate coverage. ${(100 - metrics.coverage_rate).toFixed(1)}% of customers lack recommendations—these may be single-product buyers or have unique purchase patterns. Consider: (1) Manual curation for uncovered segments, (2) Broader product education, (3) Bundle promotions to establish patterns.`
    : `Low coverage indicates majority of customers buy products independently without clear patterns. Critical actions: (1) Bundle promotions to seed purchase associations, (2) Onboarding flows suggesting complementary products, (3) Lower confidence thresholds cautiously, (4) Category-level recommendations as fallback.`}

■ Average Basket Size: ${metrics.avg_basket_size.toFixed(1)} products per customer
${metrics.avg_basket_size >= 3
  ? `Strong multi-product purchasing. Customers naturally bundle items, creating rich association data for mining. This behavior indicates: (1) Product catalog has good complementarity, (2) Customers understand product relationships, (3) Current merchandising may already encourage bundling. Leverage with: "Complete the Set" campaigns, bundle discounts (10-15% off), and cross-category recommendations.`
  : metrics.avg_basket_size >= 2
  ? `Moderate bundling. Most customers buy 2-3 items per transaction, suggesting awareness of product relationships but room for improvement. Strategies: (1) Product page cross-sells ("Frequently bought together"), (2) Cart suggestions before checkout, (3) Email follow-ups post-purchase, (4) Bundle incentives to increase basket depth.`
  : `Low basket size (≈1.0) indicates primarily single-item purchases, limiting cross-sell data. This is critical—without multi-product baskets, association rules are weak. Immediate actions: (1) Prominent "Customers also bought" displays, (2) Bundle discounts (e.g., "Buy 2, save 20%"), (3) Checkout upsells, (4) Category browsing encouragement, (5) First-purchase bundle offers for new customers.`}

${r.top_rules.length > 0 
  ? `\n■ Top Cross-Sell Opportunity\nRule: ${r.top_rules[0].if_bought.join(', ')} → ${r.top_rules[0].then_recommend.join(', ')}\nThis is your strongest cross-sell pattern. Customers who purchase ${r.top_rules[0].if_bought[0]} have ${(r.top_rules[0].confidence * 100).toFixed(1)}% probability of also buying ${r.top_rules[0].then_recommend[0]} (${r.top_rules[0].lift.toFixed(2)}x lift vs. baseline purchase rate). \n\nActionable strategies: (1) Feature this pairing on ${r.top_rules[0].if_bought[0]} product page, (2) Create "${r.top_rules[0].if_bought[0]} + ${r.top_rules[0].then_recommend[0]}" bundle with 10-15% discount, (3) Triggered email campaign: customers who bought ${r.top_rules[0].if_bought[0]} in last 30 days receive "${r.top_rules[0].then_recommend[0]}" recommendation, (4) Retargeting ads showing ${r.top_rules[0].then_recommend[0]} to ${r.top_rules[0].if_bought[0]} buyers, (5) In-store: position items adjacently.`
  : ''}`}
          />

          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">
              Understand Methodology<ArrowRight className="w-4 h-4" />
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
        title: "Apriori Algorithm - Frequent Itemset Mining",
        content: "The Apriori algorithm identifies products frequently purchased together by scanning transaction data. It uses a 'bottom-up' approach: first finding individual popular items, then 2-item combinations, then 3-item combinations, etc. Only itemsets meeting minimum support threshold (5% of transactions) advance to rule generation."
      },
      {
        num: 2,
        title: "Support Metric - Transaction Frequency",
        content: `Support measures how often a product combination appears in transactions. Formula: Support(A,B) = Count(A AND B) / Total Transactions. ${results.results.top_rules.length > 0 ? `Your top rule has ${(results.results.top_rules[0].support * 100).toFixed(1)}% support, meaning it appears in ${Math.round(results.results.top_rules[0].support * results.summary.total_customers)} customer baskets.` : 'Higher support indicates more reliable patterns.'}`
      },
      {
        num: 3,
        title: "Confidence - Purchase Probability",
        content: "Confidence measures the likelihood of buying product B given that product A was purchased. Formula: Confidence(A→B) = Support(A,B) / Support(A). A confidence of 70% means 70% of customers who bought A also bought B. This is your primary recommendation strength metric."
      },
      {
        num: 4,
        title: "Lift - Association Strength",
        content: `Lift compares actual co-purchase rate vs. random chance. Formula: Lift(A→B) = Confidence(A→B) / Support(B). Lift = 1.0 means no association (products are independent). Lift > 1.0 indicates positive association. ${results.results.top_rules.length > 0 && results.results.top_rules[0].lift >= 2.0 ? `Your top rule has ${results.results.top_rules[0].lift.toFixed(2)}x lift—a strong cross-sell signal.` : 'Lift ≥ 2.0 represents strong cross-sell opportunities.'}`
      }
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-primary" />
            Understanding the Methodology
          </CardTitle>
          <CardDescription>
            How association rules mining discovers cross-sell opportunities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Next Best Action uses the Apriori algorithm to discover product purchase patterns. By analyzing which items are frequently bought together, it generates personalized recommendations with confidence scores, enabling data-driven cross-sell strategies." />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Algorithm Components</h4>
            {explanations.map((exp) => (
              <div key={exp.num} className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">{exp.num}</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-1">{exp.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{exp.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div>
            <h4 className="font-medium text-sm mb-3">Strategic Framework by Lift Score</h4>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-green-600/30 bg-green-600/5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-sm">Strong Association (Lift ≥ 2.0)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Action:</strong> Premium cross-sell opportunity - maximum focus
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                  <li>• <strong>Bundling:</strong> Create "Buy Together" packages with 10-15% discount</li>
                  <li>• <strong>Checkout:</strong> Prominent "Add to Cart" suggestion on product detail page</li>
                  <li>• <strong>Email:</strong> Triggered campaigns for Product A buyers suggesting Product B</li>
                  <li>• <strong>Messaging:</strong> "85% of customers also bought..." social proof</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h4 className="font-medium text-sm">Meaningful Association (Lift 1.5-2.0)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Action:</strong> Solid cross-sell - implement recommendations
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                  <li>• <strong>Recommendations:</strong> Include in "You may also like" section</li>
                  <li>• <strong>Carousel:</strong> Display in related products widget</li>
                  <li>• <strong>A/B Test:</strong> Measure conversion lift before scaling</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-5 h-5 text-muted-foreground" />
                  <h4 className="font-medium text-sm">Weak Association (Lift 1.0-1.5)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Action:</strong> Minor uplift - use as filler content
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                  <li>• <strong>Fallback:</strong> Show when stronger recommendations unavailable</li>
                  <li>• <strong>Low Priority:</strong> Don't lead with these in marketing</li>
                </ul>
              </div>
            </div>
          </div>

          <DetailParagraph
            title="Implementation Roadmap"
            detail={`Systematic approach to deploying Next Best Action recommendations:

Week 1: Quick Wins
• Identify top 3-5 rules (Lift ≥ 2.0)
• Implement "Frequently Bought Together" on product pages for these pairs
• Add cross-sell suggestions at checkout
• Measure baseline: AOV, conversion rate, cart abandonment

Week 2-4: Recommendation Engine
• Integrate rules into product recommendation system
• Build customer-product matching logic (if-bought → then-recommend)
• Deploy personalized email campaigns for past purchasers
• A/B test: Recommendations ON vs Control (no recommendations)

Month 2: Bundle Creation & Promotion
• Create product bundles for high-lift pairs
• Offer bundle discounts (10-15% off vs. individual pricing)
• Promote bundles in email, ads, homepage features
• Track bundle adoption rate and revenue impact

Month 3: Optimization & Expansion
• Analyze A/B test results (target: 10-20% AOV lift)
• Refine rules: Update monthly as purchase patterns evolve
• Expand to: (1) Browse-based recommendations, (2) Post-purchase emails, (3) Mobile app
• Segment analysis: Do rules differ for B2B vs B2C? New vs returning customers?

Ongoing: Continuous Improvement
• Re-run analysis monthly (product catalog changes, seasonality)
• Track rule performance: CTR, conversion rate, revenue per recommendation
• Remove low-performing rules (Lift < 1.2, Low confidence)
• Add new products to analysis as they launch

Success Metrics:
• Recommendation CTR: 5-10% (customers click "Also bought")
• Conversion Rate: 20-30% (clicked recommendations purchased)
• AOV Lift: 15-25% increase from cross-sell
• Bundle Adoption: 10-15% of orders include bundles
• Coverage Maintenance: Keep 70%+ customers with recommendations`}
          />

          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(6)} className="gap-2">
              View Full Report<ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => {
    if (!results) return null;
    
    const { summary, results: r, visualizations, key_insights } = results;
    const metrics = r.metrics;

    const handleDownloadCSV = () => {
      const customers = r.customer_recommendations;
      const headers = ['customer_id', 'basket_size', 'purchased_products', 'recommendation_1', 'recommendation_2', 'recommendation_3', 'rec_1_confidence', 'rec_1_lift'];
      const csv = [
        headers.join(','),
        ...customers.map(c => [
          c[customerIdCol],
          c.basket_size,
          `"${c.purchased_products.join(';')}"`,
          c.recommendations[0]?.product || '',
          c.recommendations[1]?.product || '',
          c.recommendations[2]?.product || '',
          c.recommendations[0]?.confidence.toFixed(3) || '',
          c.recommendations[0]?.lift.toFixed(2) || ''
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'next_best_action_analysis.csv';
      a.click();
    };

    const handleDownloadPNG = (key: string) => {
      const value = visualizations[key as keyof typeof visualizations];
      if (!value) return;
      
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${value}`;
      link.download = `nba_${key}.png`;
      link.click();
    };

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Next Best Action Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Association Rules Analysis | {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={summary.total_customers.toLocaleString()} label="Customers" highlight />
              <MetricCard value={metrics.total_rules} label="Rules" />
              <MetricCard value={`${metrics.coverage_rate.toFixed(1)}%`} label="Coverage" />
              <MetricCard value={metrics.avg_basket_size.toFixed(1)} label="Basket Size" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Market basket analysis identified {summary.total_rules} cross-sell patterns from {summary.total_customers.toLocaleString()} customer transactions. 
              Apriori algorithm discovered {metrics.total_rules} association rules with {metrics.coverage_rate.toFixed(1)}% recommendation coverage. 
              Average basket size: {metrics.avg_basket_size.toFixed(1)} products per customer.
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
                {visualizations.product_popularity && <TabsTrigger value="product_popularity" className="text-xs">Popularity</TabsTrigger>}
                {visualizations.basket_distribution && <TabsTrigger value="basket_distribution" className="text-xs">Baskets</TabsTrigger>}
                {visualizations.association_rules && <TabsTrigger value="association_rules" className="text-xs">Rules</TabsTrigger>}
                {visualizations.coverage_and_recommendations && <TabsTrigger value="coverage_and_recommendations" className="text-xs">Coverage</TabsTrigger>}
                {visualizations.confidence_lift_scatter && <TabsTrigger value="confidence_lift_scatter" className="text-xs">Scatter</TabsTrigger>}
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
            <CardTitle className="text-base">Top Association Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">If Bought</TableHead>
                    <TableHead className="text-xs">Then Recommend</TableHead>
                    <TableHead className="text-right text-xs">Confidence</TableHead>
                    <TableHead className="text-right text-xs">Lift</TableHead>
                    <TableHead className="text-right text-xs">Support</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.top_rules.slice(0, 10).map((rule, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-xs">{rule.if_bought.join(', ')}</TableCell>
                      <TableCell className="text-xs">{rule.then_recommend.join(', ')}</TableCell>
                      <TableCell className="text-right text-xs">{(rule.confidence * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right text-xs">
                        <Badge variant={rule.lift >= 2.0 ? "default" : "secondary"} className="text-xs">
                          {rule.lift.toFixed(2)}x
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">{(rule.support * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Most Recommended Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {r.top_recommendations.slice(0, 10).map((rec, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                    </div>
                    <span className="text-sm font-medium">{rec.product}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{rec.frequency} recommendations</Badge>
                </div>
              ))}
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
                Customer Recommendations (CSV)
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
            Back to Methodology
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
          <Button variant="ghost" size="sm" onClick={() => setShowGuide(true)} className="gap-2">
            <BookOpen className="w-4 h-4" />Guide
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


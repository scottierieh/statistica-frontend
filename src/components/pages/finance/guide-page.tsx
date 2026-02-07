'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, TrendingUp, BarChart3, PieChart, Target, Layers, BookOpen,
  Settings2, ShieldCheck, Search, Lightbulb, CheckCircle2, Sparkles,
  FileSearch, HelpCircle, ArrowRight, Calculator, Sliders, FileText,
  GitCompare, LineChart, Upload, Play, FileSpreadsheet, Zap,
  Building2, Wallet, Activity, Gauge, RefreshCw, Scale,
  AlertTriangle, Users, Crosshair, Trophy, BarChart, Clock,
  TrendingDown, CreditCard, Landmark, Box, Percent
} from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';


// ============================================================
// Financial Modeling Methods (By Categories)
// ============================================================
const financialModels = [
  // Forecasting
  { category: 'Forecasting', model: 'Sales & Operations', description: 'Integrated sales and operations planning with demand-supply alignment.', keyOutput: 'Monthly sales plan, capacity utilization, inventory targets' },
  { category: 'Forecasting', model: 'Revenue Forecast', description: 'Projects future revenue using historical trends, seasonality, and growth assumptions.', keyOutput: 'Monthly/quarterly revenue projections, growth rates' },
  { category: 'Forecasting', model: 'Cost Forecast', description: 'Estimates future costs based on cost drivers, inflation, and operational plans.', keyOutput: 'Cost breakdown by category, margin impact analysis' },
  { category: 'Forecasting', model: 'Cash Flow Forecast', description: 'Projects future cash inflows and outflows to assess liquidity.', keyOutput: 'Cash balance timeline, runway analysis, burn rate' },
  { category: 'Forecasting', model: 'Demand Forecast', description: 'Predicts customer demand using time-series and causal methods.', keyOutput: 'Demand projections, confidence intervals, seasonality patterns' },
  { category: 'Forecasting', model: 'Scenario Forecast', description: 'Models best-case, base-case, and worst-case financial outcomes.', keyOutput: 'Scenario comparison table, probability-weighted outcomes' },

  // Valuation
  { category: 'Valuation', model: 'DCF Model', description: 'Discounted Cash Flow — values a business based on projected future free cash flows.', keyOutput: 'Enterprise value, equity value, implied share price' },
  { category: 'Valuation', model: 'Comparable Company Analysis', description: 'Values a company relative to similar publicly traded peers using multiples.', keyOutput: 'Valuation range, EV/EBITDA, P/E multiples' },
  { category: 'Valuation', model: 'Precedent Transactions', description: 'Uses past M&A transactions to derive valuation multiples.', keyOutput: 'Transaction multiples, implied valuation range' },
  { category: 'Valuation', model: 'Startup Valuation', description: 'Early-stage valuation using VC method, scorecard, or Berkus approach.', keyOutput: 'Pre/post-money valuation, dilution analysis' },

  // Budgeting & Planning
  { category: 'Budgeting & Planning', model: 'Annual Budget Planning', description: 'Comprehensive annual budget with revenue targets, cost centers, and headcount.', keyOutput: 'Departmental budgets, P&L budget, headcount plan' },
  { category: 'Budgeting & Planning', model: 'Rolling Forecast', description: 'Continuously updated forecast blending actuals with projections.', keyOutput: 'Full-year outlook, YTD variance, reforecast by method' },
  { category: 'Budgeting & Planning', model: 'Department Budget Allocation', description: 'Allocates budget across departments based on priorities and historical spend.', keyOutput: 'Allocation percentages, department P&L, efficiency metrics' },
  { category: 'Budgeting & Planning', model: 'Variance Analysis', description: 'Compares budget vs actuals to identify deviations and root causes.', keyOutput: 'Variance by line item, favorable/unfavorable flags, trends' },
  { category: 'Budgeting & Planning', model: 'Strategic Planning', description: 'Long-term (3-5 year) financial plan aligned with business strategy.', keyOutput: 'Multi-year P&L, strategic initiative ROI, milestone tracking' },

  // Profitability Analysis
  { category: 'Profitability Analysis', model: 'Product Profitability', description: 'Analyzes margin and profitability at the product/SKU level.', keyOutput: 'Contribution margin by product, break-even analysis, product ranking' },
  { category: 'Profitability Analysis', model: 'Customer Profitability', description: 'Measures profit generated by each customer or segment.', keyOutput: 'Customer LTV tiers, cost-to-serve, segment P&L' },
  { category: 'Profitability Analysis', model: 'Unit Economics', description: 'Evaluates per-unit financial performance — LTV, CAC, payback, margins.', keyOutput: 'LTV:CAC ratio, payback period, margin stack, sensitivity' },
  { category: 'Profitability Analysis', model: 'Contribution Margin Analysis', description: 'Separates fixed and variable costs to determine contribution per unit.', keyOutput: 'Contribution margin ratio, break-even volume, operating leverage' },

  // Capital & Investment
  { category: 'Capital & Investment', model: 'Portfolio Optimization', description: 'Mean-Variance optimization via Monte Carlo simulation for asset allocation.', keyOutput: 'Efficient frontier, Max Sharpe/Min Var portfolios, allocation comparison' },
  { category: 'Capital & Investment', model: 'CAPEX Planning', description: 'Plans and evaluates capital expenditure projects with depreciation schedules.', keyOutput: 'CAPEX timeline, depreciation impact, cash flow effect' },
  { category: 'Capital & Investment', model: 'ROI Analysis', description: 'Calculates return on investment for projects or initiatives.', keyOutput: 'ROI %, payback period, net benefit analysis' },
  { category: 'Capital & Investment', model: 'IRR / NPV Calculator', description: 'Evaluates investment attractiveness using internal rate of return and net present value.', keyOutput: 'NPV, IRR, sensitivity to discount rate, decision recommendation' },
  { category: 'Capital & Investment', model: 'Payback Period Analysis', description: 'Determines how long an investment takes to recoup its initial cost.', keyOutput: 'Simple & discounted payback, cumulative cash flow curve' },

  // Risk Modeling
  { category: 'Risk Modeling', model: 'Financial Risk Assessment', description: 'Identifies and quantifies key financial risks using simulation.', keyOutput: 'Risk heatmap, VaR, expected loss, mitigation recommendations' },
  { category: 'Risk Modeling', model: 'Liquidity Risk', description: 'Assesses the risk of insufficient cash to meet obligations.', keyOutput: 'Liquidity ratio trends, cash runway, stress test results' },
  { category: 'Risk Modeling', model: 'Credit Risk Modeling', description: 'Evaluates the likelihood and impact of counterparty default.', keyOutput: 'Default probability, expected credit loss, risk rating' },
  { category: 'Risk Modeling', model: 'Market Risk Simulation', description: 'Simulates impact of market movements (rates, FX, commodities) on financials.', keyOutput: 'Scenario impact table, VaR, hedging recommendations' },

  // Financial Statements
  { category: 'Financial Statements', model: '3-Statement Model', description: 'Integrated Income Statement, Balance Sheet, and Cash Flow model.', keyOutput: 'Linked 3 statements, key ratios, historical + projected' },
  { category: 'Financial Statements', model: 'Working Capital Model', description: 'Analyzes and forecasts working capital needs (AR, AP, inventory).', keyOutput: 'Cash conversion cycle, working capital ratios, funding needs' },
  { category: 'Financial Statements', model: 'Debt Schedule Modeling', description: 'Models debt repayment, interest expense, and covenant compliance.', keyOutput: 'Amortization schedule, interest coverage, debt/equity ratios' },
];

const groupedModels = financialModels.reduce((acc, model) => {
  if (!acc[model.category]) acc[model.category] = [];
  acc[model.category].push(model);
  return acc;
}, {} as Record<string, typeof financialModels>);

const categoryIcons: Record<string, React.ElementType> = {
  'Forecasting': TrendingUp,
  'Valuation': Landmark,
  'Budgeting & Planning': Wallet,
  'Profitability Analysis': PieChart,
  'Capital & Investment': Building2,
  'Risk Modeling': ShieldCheck,
  'Financial Statements': FileText,
};


// ============================================================
// Key Features (Tab 1)
// ============================================================
const FM_FEATURES = [
  {
    id: 'model-based',
    icon: Building2,
    label: 'Model-Based Selection',
    description: 'Choose the exact financial model you need: DCF, Rolling Forecast, Unit Economics, and more.',
  },
  {
    id: 'scenario-config',
    icon: Sliders,
    label: 'Scenario Configuration',
    description: 'Adjust assumptions, run what-if analysis, and compare base/upside/downside outcomes.',
  },
  {
    id: 'dual-input',
    icon: Upload,
    label: 'Flexible Data Input',
    description: 'Upload CSV data to pre-fill or start from pre-loaded templates — edit everything afterward.',
  },
  {
    id: 'financial-output',
    icon: BarChart3,
    label: 'Complete Financial Output',
    description: 'Get KPI dashboards, interactive charts, comparison tables, key findings, and exportable reports.',
  },
];


// ============================================================
// Top-Level Workflow (Tab 2)
// ============================================================
const WORKFLOW_STEPS = [
  {
    id: 1,
    icon: Search,
    label: 'Select Model',
    description: 'Choose a financial model from the sidebar (e.g., DCF, Rolling Forecast, Portfolio Optimization, Unit Economics).',
  },
  {
    id: 2,
    icon: Layers,
    label: 'Load Data',
    description: 'Upload your dataset (CSV) to pre-fill the model, or start from a pre-loaded template with sample data.',
  },
  {
    id: 3,
    icon: Play,
    label: 'Configure & Run',
    description: 'Set assumptions, adjust parameters, run the model through a guided step-by-step process, and explore results.',
  },
];


// ============================================================
// Inside "Configure & Run" — 6 Steps (Tab 2)
// ============================================================
const RUN_MODEL_STEPS = [
  {
    id: 1,
    icon: Settings2,
    label: 'Assumptions',
    description: 'Define core assumptions: growth rates, discount rates, churn, margins, time horizons, and other model-specific parameters.',
    visual: 'assumptions',
  },
  {
    id: 2,
    icon: FileSpreadsheet,
    label: 'Inputs',
    description: 'Enter or edit the data that drives the model — asset classes, monthly figures, cost items, revenue streams, etc.',
    visual: 'inputs',
  },
  {
    id: 3,
    icon: Sliders,
    label: 'Configuration',
    description: 'Fine-tune model settings: forecast method, scenario adjustments, simulation parameters, and sensitivity ranges.',
    visual: 'configuration',
  },
  {
    id: 4,
    icon: Calculator,
    label: 'Calculation',
    description: 'The model runs its engine — simulations, formulas, projections — and computes all derived metrics step by step.',
    visual: 'calculation',
  },
  {
    id: 5,
    icon: Sparkles,
    label: 'Results',
    description: 'View KPI dashboards, comparison tables, interactive charts, key findings, and actionable recommendations.',
    visual: 'results',
  },
  {
    id: 6,
    icon: FileText,
    label: 'Report',
    description: 'Export a complete report with summary, charts, and tables as CSV or PNG for stakeholders.',
    visual: 'report',
  },
];


// ============================================================
// Visual Step Components — 6 step visuals
// ============================================================
const VisualStep = ({ step }: { step: typeof RUN_MODEL_STEPS[0] }) => {
  switch (step.visual) {
    case 'assumptions':
      return (
        <div className="w-full max-w-xs space-y-2">
          <div className="p-3 bg-white rounded-md border shadow-sm">
            <Label className="text-xs text-muted-foreground">Growth Rate</Label>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-medium">Annual Revenue Growth</span>
              <Badge>12.5%</Badge>
            </div>
          </div>
          <div className="p-3 bg-white rounded-md border shadow-sm">
            <Label className="text-xs text-muted-foreground">Discount Rate</Label>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-medium">WACC</span>
              <Badge variant="outline">10.0%</Badge>
            </div>
          </div>
          <div className="p-3 bg-white rounded-md border shadow-sm">
            <Label className="text-xs text-muted-foreground">Time Horizon</Label>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-medium">Projection Period</span>
              <Badge variant="outline">5 Years</Badge>
            </div>
          </div>
        </div>
      );

    case 'inputs':
      return (
        <div className="w-full max-w-xs space-y-2">
          <div className="bg-white rounded-md border shadow-sm overflow-hidden">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="py-1 px-2">Item</TableHead>
                  <TableHead className="py-1 px-2 text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="py-1 px-2">Revenue (FY24)</TableCell>
                  <TableCell className="py-1 px-2 text-right font-mono">$14,520K</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-1 px-2">COGS</TableCell>
                  <TableCell className="py-1 px-2 text-right font-mono">$4,356K</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="py-1 px-2">OpEx</TableCell>
                  <TableCell className="py-1 px-2 text-right font-mono">$6,260K</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-2 justify-center">
            <Badge variant="outline" className="text-[10px]">
              <Upload className="w-3 h-3 mr-1" />CSV Upload
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              <FileSpreadsheet className="w-3 h-3 mr-1" />Manual Edit
            </Badge>
          </div>
        </div>
      );

    case 'configuration':
      return (
        <div className="w-full max-w-xs space-y-2">
          <div className="p-2 bg-white rounded-md border shadow-sm flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Forecast Method</span>
            <Badge>Run-Rate</Badge>
          </div>
          <div className="p-2 bg-white rounded-md border shadow-sm flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Scenario</span>
            <Badge variant="outline">Base Case</Badge>
          </div>
          <div className="p-2 bg-white rounded-md border shadow-sm flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Revenue Adj.</span>
            <Badge variant="outline">+0%</Badge>
          </div>
          <div className="p-2 bg-white rounded-md border shadow-sm flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Simulations</span>
            <Badge variant="outline">8,000</Badge>
          </div>
        </div>
      );

    case 'calculation':
      return (
        <div className="w-full max-w-xs p-4 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Step-by-Step</span>
          </div>
          <div className="space-y-2">
            {[
              { step: '1', label: 'ARPU × Margin', value: '$64.08/mo' },
              { step: '2', label: '1 ÷ Churn Rate', value: '31.3 months' },
              { step: '3', label: 'GP × Lifespan', value: '$2,006 LTV' },
            ].map(({ step, label, value }) => (
              <div key={step} className="flex items-center gap-2 text-xs">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{step}</div>
                <span className="text-muted-foreground flex-1">{label}</span>
                <span className="font-mono font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'results':
      return (
        <div className="w-full max-w-xs space-y-2">
          <div className="p-4 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Key Findings</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 rounded border">
                <p className="text-[10px] text-muted-foreground">LTV:CAC</p>
                <p className="text-lg font-bold text-green-600">5.7x</p>
              </div>
              <div className="text-center p-2 rounded border">
                <p className="text-[10px] text-muted-foreground">Payback</p>
                <p className="text-lg font-bold text-primary">5.5mo</p>
              </div>
            </div>
          </div>
        </div>
      );

    case 'report':
      return (
        <div className="w-full max-w-xs p-4 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Export Report</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded border bg-muted/20">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span className="text-xs">CSV — Data & Tables</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded border bg-muted/20">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-xs">PNG — Charts & Summary</span>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};


// ============================================================
// Feature Visual Components
// ============================================================
const FeatureVisual = ({ featureId }: { featureId: string }) => {
  switch (featureId) {
    case 'model-based':
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
          <Building2 className="w-16 h-16 text-primary mb-4" />
          <div className="space-y-2">
            <Badge variant="outline" className="text-sm">DCF Valuation</Badge>
            <Badge variant="outline" className="text-sm">Rolling Forecast</Badge>
            <Badge variant="outline" className="text-sm">Unit Economics</Badge>
          </div>
        </motion.div>
      );
    case 'scenario-config':
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
          <Sliders className="w-16 h-16 text-primary mb-4" />
          <div className="space-y-1 text-center">
            <p className="text-xs text-muted-foreground">Base Case / Upside / Downside</p>
            <p className="text-xs text-muted-foreground">Revenue: +0% / +10% / −15%</p>
            <p className="text-xs text-muted-foreground">Monte Carlo: 5,000–10,000 runs</p>
          </div>
        </motion.div>
      );
    case 'dual-input':
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs space-y-3">
          <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-primary/30">
            <Upload className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Upload CSV</p>
              <p className="text-xs text-muted-foreground">Pre-fill with your data</p>
            </div>
          </div>
          <div className="flex items-center justify-center text-xs text-muted-foreground">— or —</div>
          <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
            <Settings2 className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Start from Template</p>
              <p className="text-xs text-muted-foreground">Pre-loaded sample data</p>
            </div>
          </div>
        </motion.div>
      );
    case 'financial-output':
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <BarChart3 className="w-12 h-12 text-primary" />
            <LineChart className="w-12 h-12 text-green-500" />
            <PieChart className="w-12 h-12 text-amber-500" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-xs text-muted-foreground">KPI Dashboard + Charts</p>
            <p className="text-xs text-muted-foreground">Key Findings + Recommendations</p>
            <p className="text-xs text-muted-foreground">Export CSV / PNG</p>
          </div>
        </motion.div>
      );
    default:
      return null;
  }
};


// ============================================================
// Main Component
// ============================================================
interface FinancialModelingGuidePageProps {
  data?: any[];
  allHeaders?: string[];
  numericHeaders?: string[];
  categoricalHeaders?: string[];
  onLoadExample?: (example: any) => void;
  onFileSelected?: (file: File) => void;
  isUploading?: boolean;
  activeAnalysis?: string;
  onAnalysisComplete?: (result: any) => void;
  onGenerateReport?: (analysisType: string, stats: any, viz: string | null) => void;
  fileName?: string;
  onClearData?: () => void;
}

export default function FinancialModelingGuidePage(props: FinancialModelingGuidePageProps) {
  const [activeFeature, setActiveFeature] = useState(FM_FEATURES[0].id);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 space-y-6">
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview & Features</TabsTrigger>
          <TabsTrigger value="procedure">Modeling Procedure</TabsTrigger>
          <TabsTrigger value="byCategory">By Categories</TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* Tab 1: Overview & Features */}
        {/* ============================================================ */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>What is Financial Modeling?</CardTitle>
              <CardDescription>
                Financial Modeling provides specialized tools for business decision-making.
                Unlike statistical analysis that tests hypotheses, financial models simulate scenarios,
                optimize allocations, and forecast outcomes to support strategic and operational decisions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Comparison: Question → Model → Decision */}
              <div className="grid md:grid-cols-3 gap-6 items-start">
                <Card className="flex flex-col items-center text-center">
                  <CardHeader>
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 mx-auto">
                      <HelpCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg">1. Your Question</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground italic">"How should we allocate our investment portfolio?"</p>
                  </CardContent>
                </Card>

                <Card className="flex flex-col items-center text-center border-2 border-primary/30 bg-primary/5">
                  <CardHeader>
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                      <Building2 className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-lg">2. Select Model</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">You choose the right model:</p>
                    <Badge variant="outline" className="text-sm">Portfolio Optimization</Badge>
                    <Badge variant="outline" className="text-sm">ROI Analysis</Badge>
                    <Badge variant="outline" className="text-sm">NPV/IRR Calculator</Badge>
                  </CardContent>
                </Card>

                <Card className="flex flex-col items-center text-center">
                  <CardHeader>
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 mx-auto">
                      <Target className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg">3. Actionable Decision</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground italic">"Rebalance to Max Sharpe: 40% Equity, 30% Bond, 20% REIT, 10% Gold → Sharpe improves by 35%"</p>
                  </CardContent>
                </Card>
              </div>

              {/* Key Features Section */}
              <div className="pt-8 border-t">
                <h3 className="text-xl font-bold mb-6">Key Features</h3>
                <div className="grid md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_400px] gap-8 items-center">
                  <div className="relative w-full h-[300px] overflow-hidden bg-slate-100 rounded-lg flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeFeature}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                        transition={{ duration: 0.35, ease: 'easeInOut' }}
                        className="absolute inset-0 flex flex-col items-center justify-center p-6"
                      >
                        <FeatureVisual featureId={activeFeature} />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="flex flex-col gap-2">
                    {FM_FEATURES.map(feature => (
                      <button
                        key={feature.id}
                        onMouseEnter={() => setActiveFeature(feature.id)}
                        className={cn(
                          "p-4 rounded-lg text-left transition-all duration-300 border-2",
                          activeFeature === feature.id
                            ? 'bg-primary/10 border-primary/30 shadow-lg'
                            : 'bg-white hover:bg-slate-50 border-transparent'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-md transition-colors",
                            activeFeature === feature.id ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600'
                          )}>
                            <feature.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{feature.label}</h4>
                            <p className="text-xs text-muted-foreground">{feature.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* Tab 2: Modeling Procedure */}
        {/* ============================================================ */}
        <TabsContent value="procedure">
          <Card>
            <CardHeader>
              <CardTitle>Financial Modeling Procedure</CardTitle>
              <CardDescription>
                Every financial model follows a structured process from data input to actionable output.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Top-Level Workflow */}
              <div>
                <h3 className="text-lg font-bold mb-4">Workflow Overview</h3>
                <div className="space-y-6">
                  {WORKFLOW_STEPS.map((step, index) => (
                    <div key={step.id} className="grid md:grid-cols-[auto,1fr] gap-6 items-start">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                          {step.id}
                        </div>
                        {index < WORKFLOW_STEPS.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-2 min-h-[40px]"></div>
                        )}
                      </div>
                      <div className="space-y-2 pt-1">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                          <step.icon className="w-5 h-5 text-primary" />
                          {step.label}
                        </h4>
                        <p className="text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Input Paths */}
              <div className="pt-6 border-t">
                <h3 className="text-lg font-bold mb-4">Data Input — Two Paths</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Upload className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Path A: Upload CSV</CardTitle>
                          <CardDescription className="text-xs">For users with existing data</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>Upload a CSV file matching the model's required format</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>Data is auto-parsed and pre-fills the model inputs</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>Each model provides a Format Guide and sample CSV download</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>All values remain editable after upload</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Settings2 className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Path B: Start from Template</CardTitle>
                          <CardDescription className="text-xs">For new users or quick exploration</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span>Pre-loaded with realistic sample data and assumptions</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span>Immediately runnable — results available from the start</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span>Modify any value to customize for your business</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span>Great for learning how the model works</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl mt-4">
                  <Lightbulb className="w-5 h-5 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">Both paths lead to the same model interface. Uploading data simply pre-fills the input fields — you can always edit, add, or remove data afterward.</p>
                </div>
              </div>

              {/* Inside Configure & Run — 6 Steps */}
              <div className="pt-8 border-t">
                <h3 className="text-xl font-bold text-center mb-8">Inside "Configure & Run" — 6 Steps</h3>
                <div className="space-y-8">
                  {RUN_MODEL_STEPS.map((step, index) => (
                    <div key={step.id} className="grid md:grid-cols-2 gap-8 items-center">
                      {/* Text Side */}
                      <div className={`space-y-4 ${index % 2 === 0 ? 'md:order-1' : 'md:order-2'}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold flex-shrink-0 border-2 border-primary/20">
                            <step.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-primary uppercase">STEP {step.id}</p>
                            <h4 className="font-bold text-xl">{step.label}</h4>
                          </div>
                        </div>
                        <p className="text-muted-foreground">{step.description}</p>
                      </div>

                      {/* Visual Side */}
                      <div className={`${index % 2 === 0 ? 'md:order-2' : 'md:order-1'}`}>
                        <Card className="overflow-hidden">
                          <CardContent className="p-0">
                            <div className="bg-muted min-h-[200px] rounded-lg flex items-center justify-center p-6">
                              <VisualStep step={step} />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* Tab 3: By Categories */}
        {/* ============================================================ */}
        <TabsContent value="byCategory">
          <Card>
            <CardHeader>
              <CardTitle>Financial Models by Category</CardTitle>
              <CardDescription>Find the right financial model for your business question, grouped by domain.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(groupedModels).map(([category, models]) => {
                  const Icon = categoryIcons[category] || Building2;
                  return (
                    <AccordionItem value={category} key={category}>
                      <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-primary" />
                          <span>{category}</span>
                          <Badge variant="outline" className="text-xs ml-2">{models.length} models</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[180px]">Model</TableHead>
                              <TableHead className="w-[35%]">Description</TableHead>
                              <TableHead className="w-[30%]">Key Output</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {models.map((model) => (
                              <TableRow key={model.model}>
                                <TableCell className="font-medium">{model.model}</TableCell>
                                <TableCell className="text-muted-foreground">{model.description}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{model.keyOutput}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
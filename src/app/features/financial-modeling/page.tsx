'use client';

import React, { useState, useEffect } from 'react';
import { FeaturePageHeader } from '@/components/feature-page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  CheckCircle2, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  FileText,
  BookOpen,
  Zap,
  Clock,
  BarChart3,
  ShieldCheck,
  Download,
  ChevronRight,
  Calculator,
  Banknote,
  ShoppingCart,
  PieChart,
  Wallet,
  Scale,
  LineChart,
  Building2,
  Landmark,
  AlertTriangle,
  Layers,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

const features = {
  'forecasting': { 
    icon: TrendingUp, 
    title: '4 Forecasting Engines', 
    description: 'Revenue, Cost, Cash Flow, and Demand forecasts with Linear Regression, Moving Average, Exponential Smoothing, and Growth Rate methods.',
    details: [
      'Revenue & cost projections',
      'Cash flow runway analysis',
      'Product-level demand forecasting',
      'Confidence bands (80%/95%)',
      'MAPE, MAE, R\u00B2 accuracy metrics',
    ]
  },
  'valuation': { 
    icon: DollarSign, 
    title: 'DCF & Comparables', 
    description: 'Full valuation suite — Discounted Cash Flow, Comparable Company Analysis, Precedent Transactions, and Startup Valuation.',
    details: [
      'DCF with WACC calculation',
      'Comparable company multiples',
      'Precedent transaction analysis',
      'Startup pre/post-money valuation',
      'Sensitivity & scenario tables',
    ]
  },
  'planning': { 
    icon: Target, 
    title: 'Budget & Planning', 
    description: 'Annual budgets, rolling forecasts, department allocation, variance analysis, and CapEx planning with ROI calculations.',
    details: [
      'Annual budget planning',
      'Rolling forecast updates',
      'Department allocation',
      'Budget vs actual variance',
      'CapEx investment analysis',
    ]
  },
  'risk': { 
    icon: ShieldCheck, 
    title: 'Risk & Compliance', 
    description: 'Monte Carlo VaR, credit scoring, liquidity stress tests, and market risk analysis with comprehensive risk dashboards.',
    details: [
      'Monte Carlo Value at Risk',
      'Credit risk scoring',
      'Liquidity stress testing',
      'Market risk assessment',
      'Portfolio optimization',
    ]
  },
  'profitability': { 
    icon: PieChart, 
    title: 'Profitability Analysis', 
    description: 'Unit economics, contribution margin, product & customer profitability — with break-even analysis and margin optimization.',
    details: [
      'Unit economics (LTV/CAC)',
      'Contribution margin & break-even',
      'Product profitability ranking',
      'Customer segment analysis',
      'Working capital optimization',
    ]
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE CARD
// ═══════════════════════════════════════════════════════════════════════════════

const FeatureCard = ({ 
  feature, 
  featureKey,
  isActive, 
  onMouseEnter, 
  onMouseLeave 
}: { 
  feature: typeof features[keyof typeof features];
  featureKey: string;
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => {
  const Icon = feature.icon;
  return (
    <div 
      className={cn(
        "p-5 rounded-lg cursor-pointer transition-all duration-200 border",
        isActive 
          ? "bg-primary/5 border-primary" 
          : "bg-white border-border hover:border-primary/50"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-1">{feature.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STEPS
// ═══════════════════════════════════════════════════════════════════════════════

const steps = [
  {
    number: '1',
    title: 'Select Tool',
    description: 'Choose from forecasting, valuation, planning, or risk tools',
    icon: Target,
  },
  {
    number: '2',
    title: 'Upload or Sample',
    description: 'Import your CSV data or start with pre-built sample datasets',
    icon: BarChart3,
  },
  {
    number: '3',
    title: 'Configure Model',
    description: 'Set parameters, methods, and assumptions with guided inputs',
    icon: Calculator,
  },
  {
    number: '4',
    title: 'Analyze Results',
    description: 'Review key findings, charts, and detail tables',
    icon: Sparkles,
  },
  {
    number: '5',
    title: 'Export Report',
    description: 'Download PNG report or CSV data for further analysis',
    icon: Download,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

const toolCategories = [
  {
    icon: TrendingUp,
    name: 'Forecasting',
    count: '4 tools',
    examples: ['Revenue Forecast', 'Cost Forecast', 'Cash Flow Forecast', 'Demand Forecast'],
  },
  {
    icon: DollarSign,
    name: 'Valuation',
    count: '4 tools',
    examples: ['DCF Model', 'Comparable Company', 'Precedent Transactions', 'Startup Valuation'],
  },
  {
    icon: Target,
    name: 'Budgeting & Planning',
    count: '5 tools',
    examples: ['Annual Budget', 'Rolling Forecast', 'Dept Allocation', 'Variance Analysis', 'CapEx Planning'],
  },
  {
    icon: ShieldCheck,
    name: 'Risk Management',
    count: '5 tools',
    examples: ['Risk Assessment', 'Credit Risk', 'Liquidity Risk', 'Market Risk', 'Portfolio Optimization'],
  },
  {
    icon: PieChart,
    name: 'Profitability',
    count: '4 tools',
    examples: ['Unit Economics', 'Contribution Margin', 'Product Profitability', 'Customer Profitability'],
  },
  {
    icon: Calculator,
    name: 'Investment Analysis',
    count: '4 tools',
    examples: ['IRR/NPV Calculator', 'ROI Analysis', 'Payback Period', 'Debt Schedule'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function FinancialModelingFeaturePage() {
  const featureKeys = Object.keys(features);
  const [activeFeature, setActiveFeature] = useState(featureKeys[0]);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (isHovering) return;
    const interval = setInterval(() => {
      setActiveFeature(current => {
        const currentIndex = featureKeys.indexOf(current);
        const nextIndex = (currentIndex + 1) % featureKeys.length;
        return featureKeys[nextIndex];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isHovering, featureKeys]);

  const currentFeature = features[activeFeature as keyof typeof features];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <FeaturePageHeader title="Financial Modeling" />
      
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="max-w-6xl mx-auto space-y-16">
          
          {/* HERO */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">
              Financial Models,
              <br />
              <span className="text-primary">Built for Action</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Professional forecasting, valuation, budgeting, and risk analysis tools. Upload your data, configure assumptions, get boardroom-ready reports with key findings.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>26 Financial Tools</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>6 Categories</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>CSV Import + Sample Data</span>
              </div>
            </div>
          </div>

          {/* KEY FEATURES */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Why Financial Modeling?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Purpose-built financial tools for CFOs, FP&amp;A analysts, and business leaders
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Feature List */}
              <div className="space-y-3">
                {Object.entries(features).map(([key, feature]) => (
                  <FeatureCard
                    key={key}
                    feature={feature}
                    featureKey={key}
                    isActive={activeFeature === key}
                    onMouseEnter={() => { setActiveFeature(key); setIsHovering(true); }}
                    onMouseLeave={() => setIsHovering(false)}
                  />
                ))}
              </div>

              {/* Feature Showcase */}
              <div className="lg:sticky lg:top-8">
                <div className="bg-white rounded-lg border shadow-lg overflow-hidden">
                  <div className="h-96 relative bg-slate-50">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeFeature}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 flex flex-col"
                      >
                        {/* Forecasting Demo */}
                        {activeFeature === 'forecasting' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Forecasting Suite</div>
                              <div className="text-xs text-muted-foreground">4 methods × 4 data types</div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2">
                              {[
                                { q: 'Where is revenue heading next quarter?', domain: 'Revenue', method: 'Linear Regression', icon: TrendingUp },
                                { q: 'Which costs are growing fastest?', domain: 'Cost', method: 'Exp Smoothing', icon: TrendingDown },
                                { q: 'Will we run out of cash?', domain: 'Cash Flow', method: 'Moving Average', icon: Banknote },
                                { q: 'How much inventory should we order?', domain: 'Demand', method: 'Growth Rate', icon: ShoppingCart },
                              ].map((item, i) => (
                                <motion.div key={item.q} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="p-3 bg-white border rounded-lg hover:border-primary cursor-pointer transition-all">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><item.icon className="w-4 h-4 text-primary" /></div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium mb-1">{item.q}</div>
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{item.domain}</span>
                                        <span className="text-xs text-muted-foreground">&rarr; {item.method}</span>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="text-xs text-blue-700">Each method includes confidence bands and accuracy metrics (MAPE, MAE, R&sup2;)</div>
                            </div>
                          </div>
                        )}

                        {/* Valuation Demo */}
                        {activeFeature === 'valuation' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Valuation Methodologies</div>
                              <div className="text-xs text-muted-foreground">Intrinsic &amp; relative value</div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2">
                              {[
                                { name: 'DCF Model', desc: 'Free cash flow projection with WACC discount', color: 'blue' },
                                { name: 'Comparable Company', desc: 'EV/Revenue, EV/EBITDA peer multiples', color: 'purple' },
                                { name: 'Precedent Transactions', desc: 'M&A deal multiples analysis', color: 'green' },
                                { name: 'Startup Valuation', desc: 'Pre/post-money with dilution modeling', color: 'emerald' },
                              ].map((item, i) => (
                                <motion.div key={item.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="p-3 bg-white border rounded-lg hover:border-primary cursor-pointer transition-all">
                                  <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", `bg-${item.color}-100`)}><DollarSign className={cn("w-5 h-5", `text-${item.color}-600`)} /></div>
                                    <div className="flex-1 min-w-0"><div className="text-sm font-medium">{item.name}</div><div className="text-xs text-muted-foreground">{item.desc}</div></div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Planning Demo */}
                        {activeFeature === 'planning' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Budget &amp; Planning Cycle</div>
                              <div className="text-xs text-muted-foreground">End-to-end FP&amp;A workflow</div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                              <div className="space-y-2">
                                {[
                                  { step: '1', label: 'Annual Budget', desc: 'Set targets by department', icon: Target },
                                  { step: '2', label: 'Dept Allocation', desc: 'Distribute across teams', icon: Layers },
                                  { step: '3', label: 'Rolling Forecast', desc: 'Update monthly outlook', icon: Activity },
                                  { step: '4', label: 'Variance Analysis', desc: 'Budget vs actual review', icon: AlertTriangle },
                                  { step: '5', label: 'CapEx Planning', desc: 'Investment ROI analysis', icon: Calculator },
                                ].map((item, i) => (
                                  <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">{item.step}</div>
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><item.icon className="w-4 h-4 text-primary" /></div>
                                    <div className="flex-1"><div className="text-xs font-medium">{item.label}</div><div className="text-xs text-muted-foreground">{item.desc}</div></div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Risk Demo */}
                        {activeFeature === 'risk' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Risk Dashboard</div>
                              <div className="text-xs text-muted-foreground">Multi-dimensional risk analysis</div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2">
                              {[
                                { name: 'Overall Risk', score: '72/100', level: 'Medium', color: 'amber' },
                                { name: 'Credit Risk', score: '680', level: 'Acceptable', color: 'green' },
                                { name: 'Liquidity Risk', score: '1.8x', level: 'Adequate', color: 'green' },
                                { name: 'Market Risk', score: 'VaR $2.1M', level: 'Moderate', color: 'amber' },
                                { name: 'Portfolio', score: 'Sharpe 1.2', level: 'Optimal', color: 'green' },
                              ].map((item, i) => (
                                <motion.div key={item.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="p-3 bg-white border rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium">{item.name}</div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm font-bold">{item.score}</span>
                                      <span className={cn("px-2 py-0.5 text-xs rounded-full", item.color === 'green' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>{item.level}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="text-xs text-blue-700">Monte Carlo simulation with 10,000 iterations for VaR/CVaR calculation</div>
                            </div>
                          </div>
                        )}

                        {/* Profitability Demo */}
                        {activeFeature === 'profitability' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Profitability Breakdown</div>
                              <div className="text-xs text-muted-foreground">Product &amp; customer level</div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                              <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-xs">
                                  <thead><tr className="bg-muted/50 border-b"><th className="p-2 text-left">Product</th><th className="p-2 text-right">Revenue</th><th className="p-2 text-right">CM%</th><th className="p-2 text-right">LTV/CAC</th></tr></thead>
                                  <tbody>
                                    {[
                                      { name: 'Pro Plan', rev: '$1.2M', cm: '82%', ltv: '4.2x', good: true },
                                      { name: 'Enterprise', rev: '$890K', cm: '76%', ltv: '5.8x', good: true },
                                      { name: 'Starter', rev: '$340K', cm: '45%', ltv: '1.3x', good: false },
                                      { name: 'Add-ons', rev: '$180K', cm: '91%', ltv: '8.1x', good: true },
                                    ].map((p, i) => (
                                      <motion.tr key={p.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }} className={cn("border-b", !p.good && "bg-red-50/50")}>
                                        <td className="p-2 font-medium">{p.name}</td>
                                        <td className="p-2 text-right font-mono">{p.rev}</td>
                                        <td className={cn("p-2 text-right font-mono font-bold", p.good ? "text-green-600" : "text-red-600")}>{p.cm}</td>
                                        <td className={cn("p-2 text-right font-mono", p.good ? "text-green-600" : "text-red-600")}>{p.ltv}</td>
                                      </motion.tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="text-xs text-amber-700">Starter plan has low CM% and LTV/CAC below 3x threshold &mdash; consider price increase or cost reduction</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Feature Details */}
                  <div className="p-4 border-t bg-white">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeFeature}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <h4 className="font-semibold text-sm mb-2">{currentFeature.title}</h4>
                        <ul className="space-y-1">
                          {currentFeature.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From data upload to boardroom-ready report in 5 guided steps
              </p>
            </div>

            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
              {steps.map((step, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 relative">
                        <step.icon className="w-7 h-7 text-primary" />
                        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {step.number}
                        </div>
                      </div>
                      <h3 className="font-semibold mb-2 text-sm">{step.title}</h3>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Average time: 5-10 minutes per analysis
              </div>
            </div>
          </section>

          {/* TOOL CATEGORIES */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Tool Categories</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                26 financial tools organized by function &mdash; find the right model for your specific needs
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {toolCategories.map((cat, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                        <cat.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1">{cat.name}</h3>
                        <p className="text-sm text-muted-foreground">{cat.count}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {cat.examples.map((example, exIdx) => (
                        <div key={exIdx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1 h-1 rounded-full bg-primary"></div>
                          <span>{example}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* WHAT YOU GET */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">What You Get</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Standardized report structure across all 26 tools
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">1</span>
                    </div>
                    <h3 className="font-semibold text-lg">Summary Cards</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    4 key metrics at a glance with color-coded thresholds &mdash; instantly see what needs attention.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /><span>Color-coded values</span></li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /><span>Contextual subtitles</span></li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /><span>Threshold alerts</span></li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">2</span>
                    </div>
                    <h3 className="font-semibold text-lg">Key Findings</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Auto-generated insights that explain what the numbers mean for your business.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /><span>Data-driven bullets</span></li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /><span>Risk flags</span></li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /><span>Recommendations</span></li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">3</span>
                    </div>
                    <h3 className="font-semibold text-lg">Detail Tables &amp; Charts</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Line-item breakdowns with color-coded metrics, interactive charts, and assessment summaries.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /><span>Interactive visualizations</span></li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /><span>Detailed metrics</span></li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /><span>PNG + CSV export</span></li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <FileText className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Built-in Guide &amp; Glossary</h3>
                      <p className="text-sm text-muted-foreground">
                        Every tool includes a step-by-step analysis guide with formulas, a glossary of financial terms, and a Format Guide for CSV data preparation &mdash; accessible from the workspace header.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* CTA */}
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Build Financial Models?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Start with sample data to explore, or upload your own financials for instant analysis.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <Button size="lg" className="gap-2">
                  <Sparkles className="w-5 h-5" />
                  Explore Tools
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <BookOpen className="w-5 h-5" />
                  View Guides
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  CSV import with auto-detection
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Sample datasets included
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  PNG + CSV export
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
'use client';

import React from 'react';
import {
  Megaphone,
  Package,
  Factory,
  Wallet,
  Gauge,
  Users,
  BookOpen,
  TrendingUp,
  Target,
  DollarSign,
  Repeat,
  BarChart3,
  ShoppingCart,
  LineChart,
  Route,
  Boxes,
  PieChart,
  CreditCard,
  Settings,
  ClipboardList,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-are-domains", label: "What are Domains?", level: 2 },
  { id: "marketing-sales", label: "Marketing & Sales", level: 2 },
  { id: "customer-engagement", label: "Customer & Engagement", level: 2 },
  { id: "operations-logistics", label: "Operations & Logistics", level: 2 },
  { id: "finance-risk", label: "Finance & Risk", level: 2 },
  { id: "quality-manufacturing", label: "Quality & Manufacturing", level: 2 },
  { id: "hr-organization", label: "HR & Organization", level: 2 },
];

export default function StrategicUseCasesPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Use Cases by Domain</h1>
            <p className="text-lg text-muted-foreground">
            Exploring business scenarios and applications across different domains
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Strategic Decision analyses are organized by business domain—each with specialized use cases, industry-standard methods, and real-world applications designed to solve specific problems."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Domain. Use Case. Solution.
            </p>
            </blockquote>
        </div>

        {/* WHAT ARE DOMAINS */}
        <section id="what-are-domains" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What are Domains?
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                Domains are <strong className="text-foreground">business function areas</strong> where strategic analyses are commonly applied. Each domain has distinct objectives, metrics, and decision-making contexts that require specialized approaches.
            </p>
            <p>
                Rather than browsing through 100+ generic analysis methods, you can navigate directly to your business domain and find analyses specifically designed for your challenges—whether that's optimizing marketing spend, reducing customer churn, streamlining operations, or managing financial risk.
            </p>
            <p>
                Each domain includes multiple use cases representing real business problems you might face. Use cases explain when to use the analysis, what data you need, and what business value you can expect.
            </p>
            </div>
        </section>

        {/* MARKETING & SALES */}
        <section id="marketing-sales" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Megaphone className="w-7 h-7 text-primary" />
            Marketing & Sales
            </h2>
            
            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                Optimize campaigns, pricing strategies, and revenue generation through data-driven marketing and sales analytics.
            </p>

            <div className="space-y-6">
              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Customer Lifetime Value Forecasting</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Predict the total revenue a customer will generate over their entire relationship with your business.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Setting customer acquisition cost (CAC) budgets</li>
                      <li>• Identifying high-value customer segments</li>
                      <li>• Prioritizing retention vs acquisition spending</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Allocate marketing budget efficiently</li>
                      <li>• Focus retention on high-LTV customers</li>
                      <li>• Justify acquisition spend with ROI projections</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Marketing Mix Modeling</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Measure the impact of each marketing channel on revenue to optimize budget allocation.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Multi-channel marketing campaigns running</li>
                      <li>• Need to prove marketing ROI</li>
                      <li>• Deciding where to increase/decrease spend</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Shift budget to highest-ROI channels</li>
                      <li>• Eliminate wasteful spending</li>
                      <li>• Forecast revenue impact of budget changes</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Pricing Optimization</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Determine optimal pricing that maximizes revenue while maintaining demand.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Launching new products or services</li>
                      <li>• Testing price sensitivity</li>
                      <li>• Responding to competitor pricing</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Maximize revenue without losing customers</li>
                      <li>• Understand price elasticity</li>
                      <li>• Balance profitability and market share</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <LineChart className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Sales Forecasting</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Predict future sales to plan inventory, staffing, and resource allocation.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Planning quarterly/annual budgets</li>
                      <li>• Seasonal business with fluctuating demand</li>
                      <li>• Investors require revenue projections</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Avoid stockouts or overstock</li>
                      <li>• Right-size teams and resources</li>
                      <li>• Set realistic revenue targets</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* CUSTOMER & ENGAGEMENT */}
        <section id="customer-engagement" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Package className="w-7 h-7 text-primary" />
            Customer & Engagement
            </h2>
            
            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                Understand customer behavior, improve retention, and optimize user experience through engagement analytics.
            </p>

            <div className="space-y-6">
              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <Repeat className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Cohort Analysis</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Track user groups over time to measure retention, engagement, and revenue patterns.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Measuring product-market fit</li>
                      <li>• Evaluating feature impact on retention</li>
                      <li>• Comparing user quality by source</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Identify when users drop off</li>
                      <li>• Compare cohort performance over time</li>
                      <li>• Validate product improvements</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Churn Prediction</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Identify customers at risk of leaving before they churn.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• High customer acquisition costs</li>
                      <li>• Subscription-based business model</li>
                      <li>• Want proactive retention campaigns</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Intervene before customers leave</li>
                      <li>• Target retention offers efficiently</li>
                      <li>• Reduce churn rate and improve LTV</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <PieChart className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Customer Segmentation</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Group customers by behavior, value, or characteristics for targeted strategies.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Personalizing marketing messages</li>
                      <li>• Building tiered pricing strategies</li>
                      <li>• Allocating support resources</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Tailor experiences to customer needs</li>
                      <li>• Improve conversion and retention</li>
                      <li>• Focus resources on high-value segments</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Market Basket Analysis</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Discover which products are frequently bought together.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• E-commerce or retail business</li>
                      <li>• Creating product bundles</li>
                      <li>• Optimizing store layouts</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Increase average order value</li>
                      <li>• Improve cross-selling effectiveness</li>
                      <li>• Optimize product placement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* OPERATIONS & LOGISTICS */}
        <section id="operations-logistics" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Factory className="w-7 h-7 text-primary" />
            Operations & Logistics
            </h2>
            
            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                Streamline operations, optimize logistics, and reduce costs through operational efficiency analytics.
            </p>

            <div className="space-y-6">
              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <Route className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Vehicle Routing Problem (VRP)</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Find optimal delivery routes that minimize distance, time, or cost.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Managing delivery fleets</li>
                      <li>• Field service scheduling</li>
                      <li>• Multi-stop logistics planning</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Reduce fuel costs by 15-30%</li>
                      <li>• Serve more customers per vehicle</li>
                      <li>• Improve delivery time accuracy</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <Boxes className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Inventory Optimization</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Determine optimal stock levels to minimize holding costs while avoiding stockouts.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Managing warehouse inventory</li>
                      <li>• Seasonal demand fluctuations</li>
                      <li>• Multi-location stock allocation</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Reduce holding costs 20-40%</li>
                      <li>• Avoid lost sales from stockouts</li>
                      <li>• Free up working capital</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Job Shop Scheduling</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Schedule jobs across machines to minimize completion time or maximize throughput.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Manufacturing with multiple machines</li>
                      <li>• Service operations with capacity limits</li>
                      <li>• Project task scheduling</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Increase equipment utilization</li>
                      <li>• Meet deadlines more consistently</li>
                      <li>• Reduce idle time and bottlenecks</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* FINANCE & RISK */}
        <section id="finance-risk" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Wallet className="w-7 h-7 text-primary" />
            Finance & Risk
            </h2>
            
            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                Manage financial risk, optimize portfolios, and make data-driven investment decisions.
            </p>

            <div className="space-y-6">
              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <PieChart className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Portfolio Optimization</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Allocate assets to maximize returns for a given level of risk.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Managing investment portfolios</li>
                      <li>• Balancing risk and return</li>
                      <li>• Diversifying asset allocation</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Maximize risk-adjusted returns</li>
                      <li>• Meet investment objectives</li>
                      <li>• Reduce portfolio volatility</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Credit Risk Scoring</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Assess the likelihood that borrowers will default on loans.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Lending or credit decisions</li>
                      <li>• Setting interest rates</li>
                      <li>• Managing loan portfolio risk</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Reduce default rates</li>
                      <li>• Price risk appropriately</li>
                      <li>• Automate approval decisions</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Value at Risk (VaR)</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Estimate potential losses in a portfolio over a specific time period.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Risk reporting requirements</li>
                      <li>• Setting risk limits</li>
                      <li>• Stress testing portfolios</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Quantify downside risk</li>
                      <li>• Comply with regulations</li>
                      <li>• Set capital reserves appropriately</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* QUALITY & MANUFACTURING */}
        <section id="quality-manufacturing" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Gauge className="w-7 h-7 text-primary" />
            Quality & Manufacturing
            </h2>
            
            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                Monitor processes, improve quality, and optimize manufacturing operations.
            </p>

            <div className="space-y-6">
              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <LineChart className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">SPC Control Charts</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Monitor process variation over time to detect quality issues early.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Continuous production processes</li>
                      <li>• Quality control monitoring</li>
                      <li>• Detecting process drift</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Catch defects before they escalate</li>
                      <li>• Reduce scrap and rework</li>
                      <li>• Maintain consistent quality</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Gage R&R (MSA)</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Assess the accuracy and repeatability of measurement systems.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Validating new measurement equipment</li>
                      <li>• Quality system certification (ISO)</li>
                      <li>• High-precision manufacturing</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Trust measurement data</li>
                      <li>• Reduce false positives/negatives</li>
                      <li>• Improve process control</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Process Capability (Cp/Cpk)</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Evaluate whether a process can consistently meet specifications.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Qualifying new processes</li>
                      <li>• Customer capability requirements</li>
                      <li>• Process improvement initiatives</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Ensure consistent quality</li>
                      <li>• Meet customer specifications</li>
                      <li>• Identify improvement opportunities</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* HR & ORGANIZATION */}
        <section id="hr-organization" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Users className="w-7 h-7 text-primary" />
            HR & Organization
            </h2>
            
            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                Optimize workforce planning, improve employee engagement, and make data-driven HR decisions.
            </p>

            <div className="space-y-6">
              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Attrition Modeling</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Predict which employees are at risk of leaving to enable proactive retention.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• High turnover costs</li>
                      <li>• Critical talent retention</li>
                      <li>• Competitive labor market</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Reduce recruitment costs</li>
                      <li>• Retain key talent</li>
                      <li>• Target retention interventions</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Compensation Analysis</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Ensure fair pay across roles, identify pay gaps, and benchmark against market.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Annual compensation reviews</li>
                      <li>• Pay equity audits</li>
                      <li>• Setting salary bands</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Ensure pay equity</li>
                      <li>• Compete for talent</li>
                      <li>• Control compensation costs</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <ClipboardList className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Employee Engagement Survey Analysis</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Analyze engagement survey data to identify drivers of satisfaction and retention.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">When to Use</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Post-engagement survey</li>
                      <li>• Organizational change initiatives</li>
                      <li>• Culture improvement programs</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary mb-2">Business Value</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Identify engagement drivers</li>
                      <li>• Prioritize improvement areas</li>
                      <li>• Track culture change over time</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}
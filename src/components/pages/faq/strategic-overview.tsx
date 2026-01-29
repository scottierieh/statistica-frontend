'use client';

import React from 'react';
import {
  Target,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  Zap,
  Calculator,
  Lightbulb,
  Award,
  DollarSign,
  Users,
  Factory,
  Wallet,
  Gauge,
  Megaphone,
  Package,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-is", label: "What is Strategic Decision?", level: 2 },
  { id: "what-you-can-do", label: "What You Can Do", level: 2 },
  { id: "browse-domains", label: "Browse by Domain", level: 2 },
  { id: "when-to-use", label: "When to Use", level: 2 },
  { id: "how-it-works", label: "How It Works", level: 2 },
];

export default function StrategicDecisionOverviewPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Overview</h1>
            <p className="text-lg text-muted-foreground">
            Solving complex business problems with domain-specific optimization
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Make data-driven strategic decisions using advanced optimization techniques tailored to your specific business domain and objectives."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Optimize. Decide. Execute.
            </p>
            </blockquote>
        </div>

        {/* WHAT IS */}
        <section id="what-is" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What is Strategic Decision?
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                Strategic Decision is designed to <strong className="text-foreground">solve complex business problems</strong> that require optimization, forecasting, and strategic planning. Unlike standard statistical tests that analyze relationships in your data, Strategic Decision helps you make actionable decisions to improve business outcomes.
            </p>
            <p>
                These analyses combine statistical modeling with domain-specific business logic—understanding not just the data patterns, but what those patterns mean for your marketing budget, inventory levels, customer retention, portfolio allocation, or manufacturing quality.
            </p>
            <p>
                Whether you're optimizing marketing spend, forecasting customer lifetime value, reducing churn, or improving manufacturing quality, Strategic Decision provides purpose-built solutions for real business challenges.
            </p>
            </div>

            <div className="mt-8 p-6 rounded-lg border bg-muted/30">
              <h3 className="font-semibold text-lg mb-4">Key Differences</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-primary" />
                    Standard Analysis
                  </p>
                  <p className="text-sm text-muted-foreground">
                    "Does X affect Y?" "What's the relationship?" Focus on understanding patterns and testing hypotheses.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Strategic Decision
                  </p>
                  <p className="text-sm text-muted-foreground">
                    "What should I do?" "How do I optimize this?" Focus on actionable decisions and business outcomes.
                  </p>
                </div>
              </div>
            </div>
        </section>

        {/* WHAT YOU CAN DO */}
        <section id="what-you-can-do" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-primary" />
            What You Can Do
            </h2>
            
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Maximize revenue and reduce costs</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Optimize pricing strategies, marketing budgets, inventory levels, and resource allocation to improve profitability and efficiency across your business operations.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Predict customer behavior and lifetime value</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Forecast customer lifetime value, identify churn risks, discover aha-moments, segment customers, and determine next-best actions to maximize retention and engagement.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Factory className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Optimize operations and logistics</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Solve routing problems, scheduling challenges, inventory optimization, process mining, and assignment problems to streamline operations and reduce operational costs.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Manage financial risk and portfolio optimization</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Analyze credit risk, calculate Value at Risk (VaR), optimize investment portfolios, detect anomalies, and perform break-even analysis for strategic financial planning.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Gauge className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Improve manufacturing quality and efficiency</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Monitor processes with SPC control charts, analyze measurement systems (Gage R&R), calculate process capability (Cp/Cpk), track OEE, and analyze yield and defects.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Analyze workforce and organizational performance</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Predict employee attrition, analyze compensation equity, assess engagement surveys, track diversity & inclusion metrics, and monitor absenteeism patterns.
                  </p>
                </div>
              </div>
            </div>
        </section>

        {/* BROWSE BY DOMAIN */}
        <section id="browse-domains" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Package className="w-7 h-7 text-primary" />
            Browse by Domain
            </h2>
            
            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                Strategic Decision analyses are organized by <strong className="text-foreground">business domain</strong> to help you quickly find solutions relevant to your industry and function.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Megaphone className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Marketing & Sales</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Optimize campaigns, pricing, and sales forecasting
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> CLV prediction, marketing mix modeling, pricing optimization, lead scoring, sales forecasting
                </p>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Customer & Engagement</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Understand and improve customer experience
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> Segmentation, churn prediction, aha-moment, cohort analysis, funnel optimization, market basket
                </p>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Factory className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Operations & Logistics</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Streamline processes and optimize resources
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> Vehicle routing, TSP, inventory optimization, job scheduling, process mining
                </p>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Finance & Risk</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Manage financial risk and optimize portfolios
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> Portfolio optimization, VaR, credit risk scoring, anomaly detection, break-even
                </p>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Gauge className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Quality & Manufacturing</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Monitor and improve production quality
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> SPC charts, Gage R&R, yield analysis, OEE, process capability
                </p>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">HR & Organization</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Optimize workforce and organizational health
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> Attrition modeling, compensation analysis, engagement surveys, diversity & inclusion
                </p>
              </div>
            </div>
        </section>

        {/* WHEN TO USE */}
        <section id="when-to-use" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Lightbulb className="w-7 h-7 text-primary" />
            When to Use Strategic Decision
            </h2>

            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Use Strategic Decision when you need to <strong className="text-foreground">make business decisions</strong> rather than simply understand data patterns.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base mb-1">You have a specific business objective</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    E.g., "Maximize revenue," "Reduce churn," "Optimize delivery routes," "Minimize costs"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base mb-1">You need actionable recommendations</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Not just "what happened" or "why," but "what should we do next?"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base mb-1">You're solving domain-specific problems</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Marketing optimization, logistics routing, financial risk, quality control—problems with established business contexts
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base mb-1">You want predictive or prescriptive analytics</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Forecasting future outcomes, identifying high-risk customers, optimizing resource allocation
                  </p>
                </div>
              </div>
            </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Zap className="w-7 h-7 text-primary" />
            How It Works
            </h2>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <div className="w-0.5 flex-1 bg-border mt-3 min-h-[40px]"></div>
                </div>

                <div className="flex-1 pb-4">
                  <h3 className="font-semibold text-xl mb-3">Select a business scenario</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Browse by domain (Marketing, Operations, Finance, etc.) and choose the analysis that matches your business challenge.
                  </p>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Example:</strong> "Customer Lifetime Value Forecasting" for predicting long-term customer value
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <div className="w-0.5 flex-1 bg-border mt-3 min-h-[40px]"></div>
                </div>

                <div className="flex-1 pb-4">
                  <h3 className="font-semibold text-xl mb-3">Provide your data</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Upload your business data or use example datasets to explore how the analysis works. Each scenario specifies what data columns are needed.
                  </p>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Example data:</strong> Customer ID, purchase history, engagement metrics, demographics
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <div className="w-0.5 flex-1 bg-border mt-3 min-h-[40px]"></div>
                </div>

                <div className="flex-1 pb-4">
                  <h3 className="font-semibold text-xl mb-3">Configure analysis parameters</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Set objectives, constraints, and preferences specific to your business context (e.g., budget limits, target metrics, risk tolerance).
                  </p>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Example settings:</strong> Forecast horizon, discount rate, risk threshold, optimization constraints
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    4
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-xl mb-3">Review actionable insights</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Get clear recommendations, visualizations, and decision support. Results include what actions to take and the expected business impact.
                  </p>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Example output:</strong> "Increase budget for Channel A by 15% to maximize ROI" or "Top 20% customers have 80% churn risk—prioritize retention offers"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-5 bg-primary/5 border-l-4 border-primary rounded">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Result format:</strong> Strategic Decision analyses provide business-focused outputs—prioritized recommendations, optimized plans, forecasts with confidence intervals, and visualizations designed for stakeholder communication.
              </p>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}
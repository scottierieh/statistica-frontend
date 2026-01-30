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

            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                Every Strategic Decision analysis follows a <strong className="text-foreground">5-step workflow</strong> that guides you from configuring your analysis to exporting complete results.
            </p>

            <div className="mb-8 grid md:grid-cols-3 gap-4">
              <div className="p-5 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <Target className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Config</h3>
                <p className="text-sm text-muted-foreground">Map columns and set parameters</p>
              </div>
              <div className="p-5 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Validation</h3>
                <p className="text-sm text-muted-foreground">Verify data and run analysis</p>
              </div>
              <div className="p-5 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <TrendingUp className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Summary</h3>
                <p className="text-sm text-muted-foreground">Review key findings</p>
              </div>
              <div className="p-5 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    4
                  </div>
                  <Lightbulb className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Methodology</h3>
                <p className="text-sm text-muted-foreground">Understand the approach</p>
              </div>
              <div className="p-5 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    5
                  </div>
                  <Award className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Report</h3>
                <p className="text-sm text-muted-foreground">Export complete analysis</p>
              </div>
            </div>

            <div className="p-5 bg-primary/5 border-l-4 border-primary rounded">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Progressive workflow:</strong> Navigate between steps using the progress bar at the top. Jump to Summary for quick insights, or dive into Methodology and Report for complete details. Each step builds on the previous one to guide you from configuration to actionable results.
              </p>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}

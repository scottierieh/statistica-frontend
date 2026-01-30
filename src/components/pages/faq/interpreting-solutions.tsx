'use client';

import React from 'react';
import {
  FileSearch,
  Lightbulb,
  FileText,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  BarChart3,
  Target,
  AlertCircle,
  Download,
  Zap,
  Award,
  Info,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-are-results", label: "What are Results?", level: 2 },
  { id: "step-summary", label: "Step 3: Summary", level: 2 },
  { id: "step-methodology", label: "Step 4: Methodology", level: 2 },
  { id: "step-report", label: "Step 5: Full Report", level: 2 },
  { id: "interpreting-results", label: "Interpreting Results", level: 2 },
];

export default function StrategicUnderstandingResultsPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Understanding Results</h1>
            <p className="text-lg text-muted-foreground">
            Interpreting strategic business analysis outcomes
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Results are presented in three progressive layers: business-focused Summary with key metrics, detailed Methodology explaining how it works, and comprehensive Full Report with all findings and recommendations."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Summary. Methodology. Report.
            </p>
            </blockquote>
        </div>

        {/* WHAT ARE RESULTS */}
        <section id="what-are-results" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What are Results?
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                Results are the <strong className="text-foreground">actionable insights and recommendations</strong> generated from your strategic analysis. Unlike statistical tests that show correlations or p-values, strategic decision results tell you what actions to take—which customers to target, how to allocate budget, what routes to use, or where to focus retention efforts.
            </p>
            <p>
                Every analysis presents results in <strong className="text-foreground">three progressive layers</strong> designed for different audiences and use cases. Start with the Summary for quick insights, read Methodology to understand the approach, then explore the Full Report for comprehensive details and visualizations.
            </p>
            <p>
                This layered structure means business stakeholders can get immediate actionable recommendations, while technical teams can verify the methodology and analysts can dive into detailed metrics and diagnostics.
            </p>
            </div>

            <div className="mt-8 grid md:grid-cols-3 gap-4">
              <div className="p-5 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <FileSearch className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Summary</h3>
                <p className="text-sm text-muted-foreground">Key findings and business metrics</p>
              </div>
              <div className="p-5 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    4
                  </div>
                  <Lightbulb className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Methodology</h3>
                <p className="text-sm text-muted-foreground">How the analysis works</p>
              </div>
              <div className="p-5 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    5
                  </div>
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Full Report</h3>
                <p className="text-sm text-muted-foreground">Complete insights and visualizations</p>
              </div>
            </div>
        </section>

        {/* STEP 3: SUMMARY */}
        <section id="step-summary" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <FileSearch className="w-7 h-7 text-primary" />
            Step 3: Summary
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                The Summary provides <strong className="text-foreground">high-level business insights</strong> and key metrics at a glance. This is what you'd share in an executive meeting or email to stakeholders who need the bottom line without technical details.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">What's Included</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Key Finding Box</p>
                      <p className="text-sm text-muted-foreground">One sentence summarizing the most important discovery or recommendation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Core Business Metrics</p>
                      <p className="text-sm text-muted-foreground">4-6 highlighted metrics (e.g., total cohorts, retention rate, revenue, optimization improvement)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Visual Summaries</p>
                      <p className="text-sm text-muted-foreground">Charts or tables showing main results (retention curves, segment sizes, route maps)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Key Insights</p>
                      <p className="text-sm text-muted-foreground">3-5 actionable insights with positive/neutral/warning status indicators</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Summary Interpretation</p>
                      <p className="text-sm text-muted-foreground">Plain-language explanation of what the numbers mean for your business</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Example Summary Components</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                    <p className="text-xs text-muted-foreground uppercase mb-1">Key Finding</p>
                    <p className="font-medium text-sm">
                      "Analyzed 12 cohorts with 5,000 users from Jan-Dec 2024. Period 1 retention averages 62%, indicating strong product-market fit."
                    </p>
                  </div>

                  <div className="grid md:grid-cols-4 gap-3">
                    <div className="text-center p-3 rounded-lg border border-primary/30 bg-primary/5">
                      <p className="text-2xl font-semibold text-primary">12</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Cohorts</p>
                    </div>
                    <div className="text-center p-3 rounded-lg border">
                      <p className="text-2xl font-semibold">5,000</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Users</p>
                    </div>
                    <div className="text-center p-3 rounded-lg border">
                      <p className="text-2xl font-semibold">62%</p>
                      <p className="text-xs text-muted-foreground mt-1">Period 1 Retention</p>
                    </div>
                    <div className="text-center p-3 rounded-lg border">
                      <p className="text-2xl font-semibold">45%</p>
                      <p className="text-xs text-muted-foreground mt-1">Long-term Retention</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-muted/10">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="font-medium text-sm">Strong first-period retention</p>
                        <p className="text-sm text-muted-foreground">62% Period 1 retention indicates good product-market fit. Users find value quickly and return.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Best Used For</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Executive Briefings</h4>
                    <p className="text-xs text-muted-foreground">
                      Share high-level findings with leadership who need quick insights without technical depth
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Quick Decision Making</h4>
                    <p className="text-xs text-muted-foreground">
                      Get immediate actionable recommendations to guide business strategy
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Status Updates</h4>
                    <p className="text-xs text-muted-foreground">
                      Communicate progress and results to teams or stakeholders via email or Slack
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Initial Exploration</h4>
                    <p className="text-xs text-muted-foreground">
                      Quickly assess if results are directionally correct before diving deeper
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* STEP 4: METHODOLOGY */}
        <section id="step-methodology" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Lightbulb className="w-7 h-7 text-primary" />
            Step 4: Methodology
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                The Methodology section <strong className="text-foreground">explains how the analysis works</strong>—the algorithms, calculations, and business logic behind the results. This helps you understand why you got specific recommendations and builds confidence in the approach.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">What's Included</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Core Concepts</p>
                      <p className="text-sm text-muted-foreground">Key definitions and principles specific to this analysis type</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Step-by-Step Process</p>
                      <p className="text-sm text-muted-foreground">How the algorithm processes your data from input to output</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Calculation Examples</p>
                      <p className="text-sm text-muted-foreground">Concrete examples showing how metrics are computed</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Interpretation Guidance</p>
                      <p className="text-sm text-muted-foreground">How to read charts, understand patterns, and apply insights</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Limitations & Considerations</p>
                      <p className="text-sm text-muted-foreground">What to watch out for, assumptions made, edge cases</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Example Methodology Topics</h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border bg-muted/10">
                    <p className="font-medium text-sm mb-2">Cohort Analysis Methodology</p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• How cohorts are defined (signup period grouping)</li>
                      <li>• Retention calculation formula: (Active / Total) × 100</li>
                      <li>• Reading retention heatmaps (rows = cohorts, columns = periods)</li>
                      <li>• Common retention patterns (flat, drop-off, smiling curve)</li>
                      <li>• Industry benchmarks and what they mean</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg border bg-muted/10">
                    <p className="font-medium text-sm mb-2">Marketing Mix Modeling Methodology</p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• How channel contributions are isolated (regression with lag effects)</li>
                      <li>• Diminishing returns modeling (saturation curves)</li>
                      <li>• Budget allocation optimization (constrained maximization)</li>
                      <li>• Attribution window logic (how long effects persist)</li>
                      <li>• Confidence intervals and uncertainty quantification</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg border bg-muted/10">
                    <p className="font-medium text-sm mb-2">Vehicle Routing Optimization Methodology</p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• Problem formulation (minimize total distance/time/cost)</li>
                      <li>• Constraint handling (capacity limits, time windows)</li>
                      <li>• Heuristic algorithms used (nearest neighbor, 2-opt, genetic)</li>
                      <li>• Route visualization and interpretation</li>
                      <li>• Solution quality metrics (% improvement vs baseline)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Best Used For</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Learning & Understanding</h4>
                    <p className="text-xs text-muted-foreground">
                      Understand how the analysis works so you can apply it correctly in future
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Verification</h4>
                    <p className="text-xs text-muted-foreground">
                      Validate that the approach is appropriate for your business context
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Stakeholder Communication</h4>
                    <p className="text-xs text-muted-foreground">
                      Explain to technical teams or auditors how recommendations were generated
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Building Trust</h4>
                    <p className="text-xs text-muted-foreground">
                      Understand the logic behind results to confidently act on recommendations
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* STEP 5: FULL REPORT */}
        <section id="step-report" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <FileText className="w-7 h-7 text-primary" />
            Step 5: Full Report
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                The Full Report provides <strong className="text-foreground">comprehensive analysis with all details</strong>, visualizations, tables, and recommendations. This is the complete deliverable you'd use for documentation, presentations, or sharing with teams.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">What's Included</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Executive Summary Section</p>
                      <p className="text-sm text-muted-foreground">Condensed overview with all key metrics in one place</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Key Insights Section</p>
                      <p className="text-sm text-muted-foreground">All actionable insights organized by priority and status</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Visualizations</p>
                      <p className="text-sm text-muted-foreground">All charts, heatmaps, and graphs in tabbed interface with download buttons</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Detailed Tables</p>
                      <p className="text-sm text-muted-foreground">Complete data breakdowns (cohort tables, channel performance, route details)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Recommendations Section</p>
                      <p className="text-sm text-muted-foreground">Immediate actions and long-term strategy suggestions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Disclaimer & Limitations</p>
                      <p className="text-sm text-muted-foreground">Important caveats and considerations for interpreting results</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Export Options</p>
                      <p className="text-sm text-muted-foreground">Download buttons for all charts and datasets</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Report Structure</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/10">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-sm">Title & Date</p>
                      <p className="text-xs text-muted-foreground">Analysis name and execution timestamp</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/10">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-sm">Executive Summary</p>
                      <p className="text-xs text-muted-foreground">Key metrics grid + paragraph summary</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/10">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-sm">Key Insights</p>
                      <p className="text-xs text-muted-foreground">Prioritized findings with status indicators</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/10">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      4
                    </div>
                    <div>
                      <p className="font-medium text-sm">Visualizations</p>
                      <p className="text-xs text-muted-foreground">Tabbed charts with download options</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/10">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      5
                    </div>
                    <div>
                      <p className="font-medium text-sm">Detailed Tables</p>
                      <p className="text-xs text-muted-foreground">Complete numeric breakdowns</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/10">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      6
                    </div>
                    <div>
                      <p className="font-medium text-sm">Recommendations</p>
                      <p className="text-xs text-muted-foreground">Immediate actions + long-term strategy</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/10">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      7
                    </div>
                    <div>
                      <p className="font-medium text-sm">Disclaimer</p>
                      <p className="text-xs text-muted-foreground">Limitations and considerations</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Best Used For</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Formal Presentations</h4>
                    <p className="text-xs text-muted-foreground">
                      Share complete findings with leadership, clients, or cross-functional teams
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Documentation</h4>
                    <p className="text-xs text-muted-foreground">
                      Archive analysis for future reference or compliance requirements
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Deep Analysis</h4>
                    <p className="text-xs text-muted-foreground">
                      Explore all details, edge cases, and nuances in the data
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Sharing with Teams</h4>
                    <p className="text-xs text-muted-foreground">
                      Provide complete context so teams can act on recommendations independently
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* INTERPRETING RESULTS */}
        <section id="interpreting-results" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-primary" />
            Interpreting Results
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Strategic analysis results are designed to be <strong className="text-foreground">actionable and business-focused</strong>, but understanding how to interpret and apply them is crucial for making good decisions.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">Key Principles</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-start gap-3 mb-2">
                      <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">Focus on Actionable Insights</p>
                        <p className="text-sm text-muted-foreground">
                          Strategic results tell you what to do, not just what happened. Look for recommendations, prioritized segments, optimized allocations, or predicted outcomes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-start gap-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">Context Matters</p>
                        <p className="text-sm text-muted-foreground">
                          Compare results to industry benchmarks, your historical performance, or business goals. A 30% retention rate might be excellent for e-commerce but poor for SaaS.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-start gap-3 mb-2">
                      <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">Pay Attention to Status Indicators</p>
                        <p className="text-sm text-muted-foreground">
                          Insights are marked as positive (🟢), neutral (🔵), or warning (🟡/🔴). Warnings don't mean failure—they highlight areas needing attention or improvement.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-start gap-3 mb-2">
                      <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">Look for Trends, Not Just Snapshots</p>
                        <p className="text-sm text-muted-foreground">
                          Re-run analyses periodically to track improvement. Are recent cohorts better than older ones? Is optimization delivering sustained gains? Trends matter more than single data points.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Common Patterns to Recognize</h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border">
                    <p className="font-medium text-sm mb-2">Improving Trends = Strategy Working</p>
                    <p className="text-xs text-muted-foreground">
                      If recent cohorts show better retention, newer campaigns have higher ROI, or optimization achieves bigger gains over time, your product/strategy improvements are working. Keep investing in what's working.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <p className="font-medium text-sm mb-2">Declining Trends = Red Flag</p>
                    <p className="text-xs text-muted-foreground">
                      If recent cohorts perform worse than older ones, or optimization gains are shrinking, investigate immediately. Possible causes: market changes, product issues, acquisition channel quality, competitor actions.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <p className="font-medium text-sm mb-2">Segments with Outlier Performance</p>
                    <p className="text-xs text-muted-foreground">
                      If one customer segment, product category, or channel significantly outperforms others, dig deeper. What makes it special? Can you replicate success elsewhere or double down on winners?
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <p className="font-medium text-sm mb-2">Diminishing Returns</p>
                    <p className="text-xs text-muted-foreground">
                      In optimization (marketing mix, inventory), watch for diminishing returns. If doubling spend only increases outcome by 20%, you've hit saturation. Shift resources elsewhere.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Pro Tip: Test Before Scaling</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Strategic recommendations are data-driven, but business reality is complex. Test recommendations on a small scale first (pilot campaign, limited product launch, one region) before full rollout. Validate results match predictions, then scale confidently.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-primary/5 border-l-4 border-primary rounded">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Remember:</strong> Strategic analyses provide recommendations based on historical patterns and optimization algorithms. They're powerful decision-support tools, but human judgment is still essential. Combine data-driven insights with domain expertise, market knowledge, and strategic vision for best results.
                </p>
              </div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}

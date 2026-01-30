'use client';

import React from 'react';
import {
  BookOpen,
  Info,
  Calculator,
  TrendingUp,
  CheckCircle2,
  Lightbulb,
  FileText,
  Search,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-are-guides", label: "What are Analysis Guides?", level: 2 },
  { id: "guide-contents", label: "What's in a Guide?", level: 2 },
  { id: "how-to-access", label: "How to Access Guides", level: 2 },
  { id: "example-guide", label: "Example Guide", level: 2 },
];

export default function StrategicGuidesPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Overview</h1>
            <p className="text-lg text-muted-foreground">
            Understanding analysis methods through built-in guides
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Every strategic analysis includes a built-in guide explaining what it does, when to use it, calculation methods, and how to interpret results—so you can make informed decisions with confidence."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Learn. Apply. Succeed.
            </p>
            </blockquote>
        </div>

        {/* WHAT ARE GUIDES */}
        <section id="what-are-guides" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What are Analysis Guides?
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                Analysis Guides are <strong className="text-foreground">built-in educational resources</strong> that explain each strategic analysis method in detail. They're designed to help you understand what the analysis does, when it's appropriate, and how to interpret the results—all without leaving the platform.
            </p>
            <p>
                Unlike generic statistics textbooks, these guides are <strong className="text-foreground">business-focused and practical</strong>. They explain concepts in plain language, provide calculation examples with business context, and include interpretation guidance specific to the analysis you're running.
            </p>
            <p>
                Every analysis has its own dedicated guide accessible via a "Guide" button on the analysis intro page. The guides are contextual—you see the right information at the right time, exactly when you need it.
            </p>
            </div>

            <div className="mt-8 grid md:grid-cols-3 gap-4">
              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Info className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">What It Does</h3>
                </div>
                <p className="text-sm text-muted-foreground">Clear explanation of the analysis purpose and business value</p>
              </div>
              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calculator className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">How It Works</h3>
                </div>
                <p className="text-sm text-muted-foreground">Calculation methods and formulas explained in business terms</p>
              </div>
              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">How to Interpret</h3>
                </div>
                <p className="text-sm text-muted-foreground">Guidance on reading results and making business decisions</p>
              </div>
            </div>
        </section>

        {/* GUIDE CONTENTS */}
        <section id="guide-contents" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <FileText className="w-7 h-7 text-primary" />
            What's in a Guide?
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Each Analysis Guide follows a <strong className="text-foreground">consistent structure</strong> designed to help you understand the method quickly and apply it correctly.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">Standard Guide Sections</h3>
                <div className="space-y-4">
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-start gap-3 mb-3">
                      <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What is [Analysis Name]?</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Plain-language explanation of what the analysis does and what business questions it answers. 
                          Includes real-world examples and use cases so you understand when to apply it.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-background rounded border">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Example:</strong> "Price Elasticity of Demand measures how sensitive demand is to price changes. 
                        It quantifies the percentage change in quantity demanded for a 1% change in price. This analysis helps determine optimal pricing strategies to maximize revenue."
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-start gap-3 mb-3">
                      <Calculator className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Calculation Method</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Technical details of how the analysis works, including formulas, algorithms, and statistical methods. 
                          Explained in accessible language with concrete examples.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-background rounded border space-y-2">
                      <p className="text-xs font-semibold text-foreground">Log-Linear Regression</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Formula: log(Quantity) = a + E × log(Price)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Where:</strong> E = Price Elasticity coefficient<br/>
                        <strong className="text-foreground">Method:</strong> Linear regression on log-transformed data<br/>
                        <strong className="text-foreground">Output:</strong> Elasticity value and R² (model quality)
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-start gap-3 mb-3">
                      <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Interpretation</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          How to read and understand the results. Includes what different values mean, what patterns to look for, 
                          and how to translate statistical outputs into business insights.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="p-3 bg-background rounded border">
                        <p className="text-xs font-semibold mb-1">E = -1.5:</p>
                        <p className="text-xs text-muted-foreground">1% price increase → 1.5% quantity decrease</p>
                      </div>
                      <div className="p-3 bg-background rounded border">
                        <p className="text-xs font-semibold mb-1">E = -0.5:</p>
                        <p className="text-xs text-muted-foreground">1% price increase → 0.5% quantity decrease</p>
                      </div>
                      <div className="p-3 bg-background rounded border">
                        <p className="text-xs font-semibold mb-1">Negative values:</p>
                        <p className="text-xs text-muted-foreground">Normal goods (price ↑ → demand ↓)</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-start gap-3 mb-3">
                      <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Model Assumptions & Limitations</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Important assumptions the analysis makes and limitations you should be aware of. 
                          This helps you understand when the analysis is appropriate and when results might be less reliable.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="p-3 bg-background rounded border">
                        <p className="text-xs font-semibold mb-1">Constant Elasticity:</p>
                        <p className="text-xs text-muted-foreground">Assumes elasticity doesn't change across price range</p>
                      </div>
                      <div className="p-3 bg-background rounded border">
                        <p className="text-xs font-semibold mb-1">Ceteris Paribus:</p>
                        <p className="text-xs text-muted-foreground">Other factors (competition, seasonality) held constant</p>
                      </div>
                      <div className="p-3 bg-background rounded border">
                        <p className="text-xs font-semibold mb-1">Historical Patterns:</p>
                        <p className="text-xs text-muted-foreground">Assumes past price-demand relationships continue</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-start gap-3 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Best Practices</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Practical recommendations for getting the most accurate and useful results from the analysis. 
                          Organized by data requirements, strategy selection, implementation, and validation.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid md:grid-cols-2 gap-3">
                      <div className="p-3 bg-background rounded border">
                        <p className="text-xs font-semibold mb-2">Data Requirements</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• 20+ observations per product</li>
                          <li>• Price variation in history</li>
                          <li>• Clean data (no outliers)</li>
                          <li>• Consistent time period</li>
                        </ul>
                      </div>
                      <div className="p-3 bg-background rounded border">
                        <p className="text-xs font-semibold mb-2">Implementation</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• Start with small changes (5-10%)</li>
                          <li>• A/B test recommendations</li>
                          <li>• Monitor competitor response</li>
                          <li>• Re-analyze quarterly</li>
                        </ul>
                      </div>
                      <div className="p-3 bg-background rounded border">
                        <p className="text-xs font-semibold mb-2">Strategy Selection</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• Elastic: Focus on volume</li>
                          <li>• Inelastic: Focus on margin</li>
                          <li>• Consider brand positioning</li>
                          <li>• Balance short vs long-term</li>
                        </ul>
                      </div>
                      <div className="p-3 bg-background rounded border">
                        <p className="text-xs font-semibold mb-2">Validation</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• Check R² score ({'>'} 0.4)</li>
                          <li>• Verify negative elasticity</li>
                          <li>• Compare with industry norms</li>
                          <li>• Test on holdout data</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Business-Focused Content</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      Unlike academic textbooks, guides emphasize practical application over theoretical details. 
                      They answer "What should I do with this information?" rather than just "What does this calculate?" 
                      Each guide is tailored to its specific analysis, so content varies based on what's most useful for that method.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* HOW TO ACCESS */}
        <section id="how-to-access" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Search className="w-7 h-7 text-primary" />
            How to Access Guides
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Analysis Guides are <strong className="text-foreground">always available</strong> and contextual—you see the right guide for the analysis you're working on.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">Accessing the Guide</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Navigate to an analysis</p>
                      <p className="text-sm text-muted-foreground">Select any strategic analysis from the domain menu (e.g., Marketing & Sales → Pricing Optimization)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Look for the "Guide" button</p>
                      <p className="text-sm text-muted-foreground">On the analysis intro page, you'll see a "Guide" button in the top-right corner or header area</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Click to open the guide</p>
                      <p className="text-sm text-muted-foreground">The guide opens in a modal/popup window overlaying your current screen</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      4
                    </div>
                    <div>
                      <p className="font-medium">Read and close when done</p>
                      <p className="text-sm text-muted-foreground">Close the guide to return to your analysis—your progress is saved</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">When to Use Guides</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Before running an analysis for the first time</p>
                      <p className="text-sm text-muted-foreground">
                        Understand what the analysis does and whether it's appropriate for your business question
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">When interpreting results</p>
                      <p className="text-sm text-muted-foreground">
                        Reference the guide to understand what specific values or patterns mean for your business
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">When explaining to stakeholders</p>
                      <p className="text-sm text-muted-foreground">
                        Use guide content to communicate how the analysis works and why the recommendations are valid
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">When results are unexpected</p>
                      <p className="text-sm text-muted-foreground">
                        Check the guide to verify you're interpreting correctly or if data issues might be present
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Guide is Always Available</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      You can access the guide at any point during your analysis—before uploading data, during configuration, 
                      or while reviewing results. It's always one click away when you need it.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* EXAMPLE GUIDE */}
        <section id="example-guide" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            Example Guide: Price Elasticity of Demand
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Here's an example of what you'd see in a typical Analysis Guide. This is for Price Elasticity of Demand analysis.
              </p>

              <div className="rounded-lg border bg-background overflow-hidden">
                {/* Guide Header */}
                <div className="p-4 bg-muted/20 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Price Elasticity of Demand Guide</h3>
                  </div>
                  <button className="text-sm text-muted-foreground hover:text-foreground">✕</button>
                </div>

                {/* Guide Content */}
                <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-primary">What is Price Elasticity of Demand?</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Price elasticity measures how sensitive demand is to price changes. It quantifies the percentage change in quantity 
                      demanded for a 1% change in price. This analysis helps determine optimal pricing strategies to maximize revenue.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-primary">Calculation Method</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="p-3 bg-muted/20 rounded">
                        <p className="text-xs font-semibold mb-1">Log-Linear Regression</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          <strong>Formula:</strong> log(Quantity) = a + E × log(Price)
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p><strong>Where:</strong> E = Price Elasticity coefficient</p>
                          <p><strong>Method:</strong> Linear regression on log-transformed data</p>
                          <p><strong>Output:</strong> Elasticity value and R² (model quality)</p>
                        </div>
                      </div>

                      <div className="p-3 bg-muted/20 rounded">
                        <p className="text-xs font-semibold mb-1">Interpretation</p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p><strong>E = -1.5:</strong> 1% price increase → 1.5% quantity decrease</p>
                          <p><strong>E = -0.5:</strong> 1% price increase → 0.5% quantity decrease</p>
                          <p><strong>Negative values:</strong> Normal goods (price ↑ → demand ↓)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-primary">Demand Classification</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="p-3 bg-muted/20 rounded">
                        <p className="text-xs font-semibold mb-1">Elastic Demand (|E| {'>'} 1)</p>
                        <p className="text-xs text-muted-foreground">
                          Demand is highly sensitive to price. Price reductions increase total revenue. 
                          Strategy: Competitive pricing, promotions, volume discounts.
                        </p>
                      </div>

                      <div className="p-3 bg-muted/20 rounded">
                        <p className="text-xs font-semibold mb-1">Inelastic Demand (|E| {'<'} 1)</p>
                        <p className="text-xs text-muted-foreground">
                          Demand is less sensitive to price. Price increases can increase total revenue. 
                          Strategy: Premium pricing, value-based pricing, margin focus.
                        </p>
                      </div>

                      <div className="p-3 bg-muted/20 rounded">
                        <p className="text-xs font-semibold mb-1">Unit Elastic (|E| = 1)</p>
                        <p className="text-xs text-muted-foreground">
                          Revenue remains constant regardless of price changes. Focus on non-price factors.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-primary">Model Assumptions & Limitations</h4>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>• <strong>Constant Elasticity:</strong> Assumes elasticity doesn't change across price range</p>
                      <p>• <strong>Ceteris Paribus:</strong> Other factors (competition, seasonality) held constant</p>
                      <p>• <strong>Historical Patterns:</strong> Assumes past price-demand relationships continue</p>
                      <p>• <strong>No Network Effects:</strong> Doesn't model viral/word-of-mouth impacts</p>
                      <p>• <strong>Requires Price Variation:</strong> Need historical data with different prices</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-primary">Best Practices</h4>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      <div className="p-2 bg-muted/20 rounded">
                        <p className="text-xs font-semibold mb-1">Data Requirements</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          <li>• 20+ observations per product</li>
                          <li>• Price variation in history</li>
                          <li>• Clean data (no outliers)</li>
                        </ul>
                      </div>
                      <div className="p-2 bg-muted/20 rounded">
                        <p className="text-xs font-semibold mb-1">Implementation</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          <li>• Start with small changes (5-10%)</li>
                          <li>• A/B test recommendations</li>
                          <li>• Monitor competitor response</li>
                        </ul>
                      </div>
                      <div className="p-2 bg-muted/20 rounded">
                        <p className="text-xs font-semibold mb-1">Strategy Selection</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          <li>• Elastic: Focus on volume</li>
                          <li>• Inelastic: Focus on margin</li>
                          <li>• Consider brand positioning</li>
                        </ul>
                      </div>
                      <div className="p-2 bg-muted/20 rounded">
                        <p className="text-xs font-semibold mb-1">Validation</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          <li>• Check R² score ({'>'} 0.4)</li>
                          <li>• Verify negative elasticity</li>
                          <li>• Compare with industry norms</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Note at Bottom</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      Elasticity estimates are based on historical price-demand relationships. Accuracy depends on data quality, 
                      price variation, and market stability. Always validate recommendations with A/B testing before full implementation. 
                      Regular re-analysis is essential as market conditions evolve.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-primary/5 border-l-4 border-primary rounded">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Note:</strong> This example shows the typical structure and content you'd find in an Analysis Guide. 
                  The actual guide may have slightly different organization depending on the complexity of the analysis, 
                  but the core sections (What is, Calculation, Interpretation, Assumptions, Best Practices) are consistent across all guides.
                </p>
              </div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}
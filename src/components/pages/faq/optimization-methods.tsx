'use client';

import React from 'react';
import {
  Settings,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  PlayCircle,
  AlertCircle,
  Target,
  Database,
  TrendingUp,
  Sliders,
  Calendar,
  DollarSign,
  Users,
  Package,
  Zap,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-is", label: "What is Running Analysis?", level: 2 },
  { id: "step-config", label: "Step 1: Configuration", level: 2 },
  { id: "step-validation", label: "Step 2: Validation", level: 2 },
];

export default function StrategicRunningAnalysisPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Running an Analysis</h1>
            <p className="text-lg text-muted-foreground">
            Configuring and executing strategic business analyses
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Configure your analysis parameters, validate your data meets requirements, and run optimization algorithms to generate actionable business insights."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Configure. Validate. Execute.
            </p>
            </blockquote>
        </div>

        {/* WHAT IS */}
        <section id="what-is" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What is Running Analysis?
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                Running Analysis is the process of <strong className="text-foreground">executing a strategic business analysis</strong> on your data. After preparing your data, you configure the analysis with business-specific parameters, validate that your data meets requirements, and then run the analysis to generate insights.
            </p>
            <p>
                Unlike standard statistical tests that simply calculate p-values or correlations, strategic analyses solve complex business problems—optimizing routes, forecasting customer value, identifying churn risks, or allocating marketing budgets. The configuration step lets you specify business objectives, constraints, and preferences that guide the optimization or prediction.
            </p>
            <p>
                Every strategic analysis follows a consistent 2-step workflow: Configuration → Validation → Execution. This ensures your analysis is properly set up, your data is valid, and results are reliable and actionable.
            </p>
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Configuration</h3>
                <p className="text-sm text-muted-foreground">Map data columns and set analysis parameters</p>
              </div>
              <div className="p-5 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Validation</h3>
                <p className="text-sm text-muted-foreground">Verify data quality and requirements</p>
              </div>
            </div>
        </section>

        {/* STEP 1: CONFIGURATION */}
        <section id="step-config" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Settings className="w-7 h-7 text-primary" />
            Step 1: Configuration
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                The configuration step is where you <strong className="text-foreground">map your data columns to analysis requirements</strong> and set business-specific parameters. Each analysis has different configuration options based on its domain and objectives.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">Column Mapping</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  First, you'll select which columns from your data correspond to the analysis requirements. The interface shows you what's needed and lets you pick from your available columns.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Identifier Columns</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Map columns that uniquely identify entities (customers, products, locations)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Examples:</strong> User ID, Customer ID, Product SKU, Location Code
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Date/Time Columns</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Map temporal data for time-series analyses, cohorts, and forecasting
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Examples:</strong> Event Date, Transaction Date, Signup Date, Delivery Date
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Value Columns</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Map numeric columns representing business metrics or outcomes
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Examples:</strong> Revenue, Cost, Quantity, Conversion Rate, Churn Probability
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Category Columns</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Map categorical data for segmentation, grouping, or classification
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Examples:</strong> Product Category, Customer Segment, Channel, Event Type
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Analysis Parameters</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  After mapping columns, you'll configure parameters specific to the analysis. These control how the algorithm runs and what objectives it optimizes for.
                </p>

                <div className="space-y-6">
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <Target className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-lg">Customer & Engagement</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Cohort Analysis</h5>
                        <p className="text-xs text-muted-foreground">Cohort type (retention/revenue), time period (weekly/monthly), minimum cohort size</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Churn Prediction</h5>
                        <p className="text-xs text-muted-foreground">Prediction window, churn definition, feature selection, model type</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Customer Segmentation</h5>
                        <p className="text-xs text-muted-foreground">Number of segments, clustering method, feature weights</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-lg">Marketing & Sales</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Marketing Mix Modeling</h5>
                        <p className="text-xs text-muted-foreground">Channel selection, lag effects, diminishing returns modeling, budget constraints</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Sales Forecasting</h5>
                        <p className="text-xs text-muted-foreground">Forecast horizon, seasonality period, confidence interval, trend method</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Pricing Optimization</h5>
                        <p className="text-xs text-muted-foreground">Price elasticity estimation, demand function, margin targets, competitor prices</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <Zap className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-lg">Operations & Logistics</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Vehicle Routing (VRP)</h5>
                        <p className="text-xs text-muted-foreground">Vehicle capacity, time windows, depot location, optimization objective (minimize distance/time/cost)</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Inventory Optimization</h5>
                        <p className="text-xs text-muted-foreground">Lead time, holding costs, stockout costs, service level targets, reorder policy</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Job Scheduling</h5>
                        <p className="text-xs text-muted-foreground">Number of machines, processing times, deadlines, priority weights, optimization goal</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sliders className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Smart Defaults</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      Most parameters have intelligent default values based on best practices. If you're unsure, stick with the defaults—they work well for most business scenarios. You can always re-run the analysis with different settings later.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* STEP 2: VALIDATION */}
        <section id="step-validation" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-primary" />
            Step 2: Validation
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Before running the analysis, the system automatically <strong className="text-foreground">validates your data and configuration</strong> to ensure reliable results. This prevents common issues and alerts you to potential problems.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">What Gets Validated</h3>
                <div className="space-y-6">
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Database className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Data Requirements</h4>
                    </div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span><strong>Minimum sample size:</strong> Enough records for the analysis (e.g., 50+ users for cohort analysis, 12+ periods for forecasting)</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span><strong>Required columns selected:</strong> All mandatory fields mapped to valid data columns</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span><strong>Data completeness:</strong> No completely empty columns, reasonable missing data percentage</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span><strong>Data types:</strong> Columns contain expected data types (dates are dates, numbers are numbers)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Target className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Business Logic Checks</h4>
                    </div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span><strong>Value ranges:</strong> Numeric values are within reasonable business bounds (e.g., no negative quantities, prices {'>'} 0)</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span><strong>Date validity:</strong> Dates are logical (no future dates for historical data, proper chronological order)</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span><strong>Sufficient variation:</strong> Data has enough diversity to produce meaningful insights (not all identical values)</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span><strong>Unique identifiers:</strong> ID columns contain unique values (no duplicate customer IDs, order IDs)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Data Quality Warnings</h4>
                    </div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Missing data percentage:</strong> High percentage of nulls in important columns (can proceed with caution)</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Outliers detected:</strong> Unusual values that might skew results (flagged for review, not blocking)</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Small sample warnings:</strong> Sample size is technically sufficient but might produce noisy results</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Unbalanced data:</strong> Severe imbalance in categories or groups (e.g., 95% one class, 5% another)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Understanding Validation Results</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-800 dark:text-green-200 mb-1">✓ Pass</p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        All validation checks passed. Your data meets requirements and you can proceed with confidence. Click "Run Analysis" to execute.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">⚠ Warning</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Some quality issues detected, but you can still proceed. Results should be interpreted with caution. Review warnings and consider cleaning data if issues are severe.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800 dark:text-red-200 mb-1">✗ Fail</p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Critical requirements not met. You must fix these issues before running the analysis. Common fixes: upload more data, select different columns, clean data quality issues.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-primary/5 border-l-4 border-primary rounded">
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  <strong className="text-foreground">What if validation fails?</strong>
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  The validation screen tells you exactly what's wrong and how to fix it. Common solutions include:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• <strong className="text-foreground">Not enough data:</strong> Upload a larger dataset or collect more records</li>
                  <li>• <strong className="text-foreground">Wrong column selected:</strong> Go back to Configuration and choose the correct column</li>
                  <li>• <strong className="text-foreground">Data quality issues:</strong> Clean your data in Excel before re-uploading</li>
                  <li>• <strong className="text-foreground">Missing required fields:</strong> Add necessary columns to your source data</li>
                </ul>
              </div>

              <div className="p-5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <PlayCircle className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Running the Analysis</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300 mb-3">
                      Once validation passes, click "Run Analysis" to execute. Processing time varies by analysis type:
                    </p>
                    <ul className="text-sm text-sky-700 dark:text-sky-300 space-y-1">
                      <li>• <strong>Fast ({'<'}10 seconds):</strong> Cohort analysis, customer segmentation, basic forecasting</li>
                      <li>• <strong>Medium (10-30 seconds):</strong> Marketing mix modeling, churn prediction, portfolio optimization</li>
                      <li>• <strong>Slow (30+ seconds):</strong> Large-scale routing problems, complex scheduling, advanced ML models</li>
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
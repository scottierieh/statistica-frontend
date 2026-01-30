
'use client';

import React from 'react';
import {
  Sigma,
  CheckCircle2,
  BookOpen,
  Info,
  HelpCircle,
  TrendingUp,
  Layers,
  ShieldCheck,
  BrainCircuit,
  Database,
  FileText,
  Settings2,
  FileSearch,
  Calculator,
  Upload,
  Sparkles,
  Download,
  Lightbulb,
  Target,
  ArrowRight,
  BarChart3,
  Users,
  Calendar,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const KEY_FEATURES = [
    {
        icon: Sigma,
        label: 'Method-Driven',
        description: 'Choose from 80+ statistical methods organized by category (comparison, regression, clustering, etc.).',
    },
    {
        icon: ShieldCheck,
        label: 'Assumption-Aware',
        description: 'Built-in validation checks ensure your data meets statistical requirements before running tests.',
    },
    {
        icon: Settings2,
        label: 'Fully Customizable',
        description: 'Control every parameter—alpha levels, post-hoc tests, confidence intervals, and more.',
    },
    {
        icon: FileText,
        label: 'Publication-Ready',
        description: 'Export APA-formatted results, tables, and charts ready for academic papers.',
    },
];

const ANALYSIS_STEPS = [
    { id: 1, label: 'Variables', icon: Database, description: 'Select dependent and independent variables' },
    { id: 2, label: 'Settings', icon: Settings2, description: 'Configure parameters and options' },
    { id: 3, label: 'Validation', icon: ShieldCheck, description: 'Verify data meets requirements' },
    { id: 4, label: 'Summary', icon: FileSearch, description: 'Plain-language findings' },
    { id: 5, label: 'Reasoning', icon: Lightbulb, description: 'Statistical logic explained' },
    { id: 6, label: 'Statistics', icon: Sigma, description: 'Complete technical output' },
];

const SECTIONS: Section[] = [
  { id: "what-is", label: "What is Standard Analysis?", level: 2 },
  { id: "comparison", label: "What You Can Do", level: 2 },
  { id: "browse-categories", label: "Browse by Category", level: 2 },
  { id: "when-to-use", label: "When to Use", level: 2 },
  { id: "key-features", label: "Key Features", level: 2 },
  { id: "how-it-works", label: "How It Works", level: 2 },
];

export default function StandardAnalysisOverviewPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 id="overview" className="text-4xl font-bold mb-2">Overview</h1>
            <p className="text-lg text-muted-foreground">
            Understanding Standard Analysis and when to use it
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Standard Analysis is a method-driven statistical workspace that gives you full control over how an analysis is run and how results are explained."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Choose the method. Validate assumptions. Understand the results.
            </p>
            </blockquote>
        </div>

        {/* WHAT IS */}
        <section id="what-is" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What is Standard Analysis?
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                Standard Analysis is for anyone who wants to{' '}
                <strong className="text-foreground">choose their own statistical method</strong>{' '}
                and have complete control over how the analysis runs.
            </p>
            <p>
                You directly select from over 80 statistical tests and models—from basic t-tests to advanced multivariate techniques. This gives you full transparency and control over every parameter, assumption check, and output format.
            </p>
            <p>
                Whether you're learning statistics for the first time or you're an experienced practitioner, Standard Analysis guides you through a structured process while giving you access to complete statistical rigor.
            </p>
            </div>
        </section>

        {/* WHAT YOU CAN DO */}
        <section id="comparison" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-primary" />
            What You Can Do
            </h2>
            
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Calculator className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Choose from 80+ statistical methods</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Access t-tests, ANOVA, regression, factor analysis, clustering, time series, and more. Browse by category or search by name.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Upload your data or use example datasets</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Upload CSV or Excel files, or start with pre-loaded example datasets to learn how each analysis works before using your own data.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Validate assumptions automatically</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Before running any test, the system checks whether your data meets requirements like normality, independence, or homogeneity of variance.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Settings2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Customize every parameter</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Set alpha levels (0.01, 0.05, 0.10), choose post-hoc tests (Tukey, Bonferroni), adjust confidence intervals (90%, 95%, 99%), and more.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Get results in 3 layers: Summary, Reasoning, Statistics</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Start with a plain-language summary, understand why with reasoning explanations, then dive into full statistical tables and charts.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Download results and share findings</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Export tables as CSV, save charts as PNG, or generate a complete analysis report to share with your team or include in publications.
                  </p>
                </div>
              </div>
            </div>
        </section>

        {/* BROWSE BY CATEGORY */}
        <section id="browse-categories" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Layers className="w-7 h-7 text-primary" />
            Browse by Category
            </h2>
            
            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                The 100+ statistical methods are organized into <strong className="text-foreground">categories based on research goals</strong>. This makes it easier to find the right analysis when you know what you want to accomplish but aren't sure which specific test to use.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Descriptive</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Summarize and describe your data without making inferences
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> Frequency tables, descriptive statistics, distributions
                </p>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Assumptions</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Test whether your data meets requirements for other analyses
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> Normality tests, homogeneity of variance, independence checks
                </p>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Comparison</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Compare means, medians, or distributions between groups
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> t-tests, ANOVA, Mann-Whitney U, Kruskal-Wallis, Chi-Square
                </p>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Relationship</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Examine associations and relationships between variables
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> Correlation, regression, chi-square test of independence
                </p>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Predictive</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Build models to predict outcomes or classify observations
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> Linear/logistic regression, decision trees, random forests
                </p>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Database className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Econometrics</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Specialized methods for economic and panel data analysis
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> Fixed effects, instrumental variables, difference-in-differences
                </p>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Structural</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Model complex relationships and latent variables
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> Factor analysis, SEM, path analysis, confirmatory factor analysis
                </p>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Clustering</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Discover natural groups or patterns in your data
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> K-means, hierarchical clustering, DBSCAN
                </p>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Time Series</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Analyze temporal patterns and forecast future values
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Includes:</strong> ARIMA, exponential smoothing, trend analysis
                </p>
              </div>
            </div>

            <div className="mt-8 p-5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Not Sure Which Category?</p>
                  <p className="text-sm text-sky-700 dark:text-sky-300">
                    Use the <strong>Recommendation</strong> tool to describe your research question and get AI-powered suggestions for which analyses to try. Or browse through categories to explore what's available.
                  </p>
                </div>
              </div>
            </div>
        </section>

        {/* WHEN TO USE */}
        <section id="when-to-use" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-primary" />
            When to Use
            </h2>

            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            Use Standard Analysis when you want{' '}
            <strong className="text-foreground">control</strong>,{' '}
            <strong className="text-foreground">transparency</strong>, and{' '}
            <strong className="text-foreground">statistically rigorous results</strong>.
            </p>

            <div className="space-y-4">
            {[
                {
                title: 'You know which statistical method you need',
                description: "You're familiar with t-tests, ANOVA, regression, or want to learn a specific method",
                },
                {
                title: 'You want full control over parameters',
                description: 'You need to customize alpha levels, post-hoc tests, confidence intervals, and other settings',
                },
                {
                title: 'You need complete statistical output',
                description: 'For academic papers, research reports, or professional presentations',
                },
                {
                title: 'You want to validate assumptions',
                description: 'Built-in checks ensure your data meets statistical requirements before running tests',
                },
            ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                    <p className="font-semibold text-base mb-1">{item.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                    </p>
                </div>
                </div>
            ))}
            </div>
        </section>

        {/* KEY FEATURES */}
        <section id="key-features" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-primary" />
            Key Features
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
            {KEY_FEATURES.map((feature, index) => (
                <div
                key={index}
                className="flex items-start gap-4 p-5 rounded-lg border bg-muted/30"
                >
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-base mb-1">{feature.label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                    </p>
                </div>
                </div>
            ))}
            </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
            <Target className="w-7 h-7 text-primary" />
            How It Works: 6-Step Process
            </h2>

            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
            Every analysis follows a consistent 6-step workflow, from selecting variables to exporting publication-ready results.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {ANALYSIS_STEPS.map((step) => (
                <div
                key={step.id}
                className="p-4 rounded-lg border bg-background"
                >
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {step.id}
                    </div>
                    <step.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="font-medium text-sm mb-1">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
            ))}
            </div>

            <div className="p-5 bg-primary/5 border-l-4 border-primary rounded">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">What happens next?</strong> Use the recommendations as a guide to select the appropriate analysis from Standard Analysis. The AI tells you which methods fit your data, then you can run those analyses with full control over settings and parameters.
              </p>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}

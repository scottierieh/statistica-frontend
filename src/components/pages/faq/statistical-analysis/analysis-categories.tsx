'use client';

import React from 'react';
import {
  Layers,
  BarChart3,
  Users,
  TrendingUp,
  Target,
  Database,
  Calendar,
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const ANALYSIS_CATEGORIES_DATA = [
  {
      icon: BarChart3,
      title: "Descriptive",
      description: "Summarize and describe your data without making inferences.",
      includes: "Frequency tables, descriptive statistics, distributions."
  },
  {
      icon: CheckCircle2,
      title: "Assumptions",
      description: "Test whether your data meets requirements for other analyses.",
      includes: "Normality tests, homogeneity of variance, independence checks."
  },
  {
      icon: Users,
      title: "Comparison",
      description: "Compare means, medians, or distributions between groups.",
      includes: "t-tests, ANOVA, Mann-Whitney U, Kruskal-Wallis, Chi-Square."
  },
  {
      icon: TrendingUp,
      title: "Relationship",
      description: "Examine associations and relationships between variables.",
      includes: "Correlation, regression, chi-square test of independence."
  },
  {
      icon: Target,
      title: "Predictive",
      description: "Build models to predict outcomes or classify observations.",
      includes: "Linear/logistic regression, decision trees, random forests."
  },
  {
      icon: Database,
      title: "Econometrics",
      description: "Specialized methods for economic and panel data analysis.",
      includes: "Fixed effects, instrumental variables, difference-in-differences."
  },
  {
      icon: Layers,
      title: "Structural",
      description: "Model complex relationships and latent variables.",
      includes: "Factor analysis, SEM, path analysis, confirmatory factor analysis."
  },
  {
      icon: Sparkles,
      title: "Clustering",
      description: "Discover natural groups or patterns in your data.",
      includes: "K-means, hierarchical clustering, DBSCAN."
  },
  {
      icon: Calendar,
      title: "Time Series",
      description: "Analyze temporal patterns and forecast future values.",
      includes: "ARIMA, exponential smoothing, trend analysis."
  }
];

const SECTIONS: Section[] = [
  { id: "what-are-categories", label: "What are Analysis Categories?", level: 2 },
  { id: "how-to-use", label: "How to Use Categories", level: 2 },
  { id: "category-list", label: "List of Categories", level: 2 },
];

export default function AnalysisCategoriesPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Analysis Categories</h1>
            <p className="text-lg text-muted-foreground">
            A guide to the types of statistical analyses available
            </p>
        </div>

        {/* WHAT ARE CATEGORIES */}
        <section id="what-are-categories" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Layers className="w-7 h-7 text-primary" />
            What are Analysis Categories?
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                Analysis Categories are a way of organizing the <strong className="text-foreground">100+ statistical methods</strong> available on our platform based on their purpose or the type of research question they answer.
            </p>
            <p>
                Instead of needing to know the exact name of a statistical test, you can browse by the goal you want to achieve. This makes it easier to find the right tool for your job, whether you're trying to compare groups, find relationships, or predict outcomes.
            </p>
            </div>
        </section>

        {/* HOW TO USE */}
        <section id="how-to-use" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-primary" />
            How to Use Categories
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                The analysis categories in the sidebar help you quickly navigate to the right set of tools.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Define Your Goal</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    First, think about what you want to achieve. Are you comparing sales between two marketing campaigns? Or are you trying to predict house prices based on features?
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Find the Matching Category</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Look for the category that best matches your goal. If you want to compare groups, open the "Comparison" category. To predict an outcome, look in "Predictive" or "Relationship."
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Select an Analysis</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Within the category, choose the specific analysis that fits your data. For example, in "Comparison," you might choose "Independent Samples T-Test" if you have two groups, or "One-Way ANOVA" if you have three or more.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Still Not Sure?</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      Use the <strong>AI Analysis Recommendation</strong> tool to describe your research question and get AI-powered suggestions for which analyses to try.
                    </p>
                  </div>
                </div>
            </div>
        </section>

        {/* CATEGORY LIST */}
        <section id="category-list" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Layers className="w-7 h-7 text-primary" />
            List of Categories
            </h2>
            <div className="space-y-5">
              {ANALYSIS_CATEGORIES_DATA.map((category) => (
                <div key={category.title} className="flex items-start gap-4 p-5 rounded-lg border bg-muted/30">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <category.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{category.title}</h3>
                    <p className="text-muted-foreground mb-2">{category.description}</p>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Includes:</strong> {category.includes}
                    </p>
                  </div>
                </div>
              ))}
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}

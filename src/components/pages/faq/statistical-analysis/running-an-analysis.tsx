
'use client';

import React from 'react';
import {
  Variable,
  Settings2,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Info,
  PlayCircle,
  AlertCircle,
  Sliders,
  Target,
  Database,
  TrendingUp,
  Hash,
  Type,
  Calendar,
  Users,
  Layers,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const VARIABLE_TYPES = [
  { 
    icon: Hash, 
    label: 'Numeric (Continuous)', 
    description: 'Numbers with meaningful values',
    examples: 'Age, Weight, Temperature, Price, Score'
  },
  { 
    icon: Type, 
    label: 'Categorical (Nominal)', 
    description: 'Categories without order',
    examples: 'Gender, Color, Country, Product Type'
  },
  { 
    icon: TrendingUp, 
    label: 'Ordinal', 
    description: 'Categories with meaningful order',
    examples: 'Education Level, Satisfaction Rating (1-5), Income Bracket'
  },
  { 
    icon: Calendar, 
    label: 'Date/Time', 
    description: 'Temporal data',
    examples: 'Purchase Date, Event Timestamp, Year'
  }
];

const VALIDATION_CHECKS = [
  {
    icon: CheckCircle2,
    title: 'Data Requirements',
    checks: [
      'Minimum sample size met',
      'Required variables selected',
      'No completely empty columns',
      'Sufficient observations per group'
    ]
  },
  {
    icon: ShieldCheck,
    title: 'Statistical Assumptions',
    checks: [
      'Normality (for parametric tests)',
      'Homogeneity of variance',
      'Independence of observations',
      'Linearity (for regression)',
      'No multicollinearity (for multiple regression)'
    ]
  },
  {
    icon: AlertCircle,
    title: 'Data Quality',
    checks: [
      'Outlier detection',
      'Missing data percentage',
      'Variable type compatibility',
      'Sufficient variation in data'
    ]
  }
];

const SECTIONS: Section[] = [
  { id: "what-is", label: "What is Running Analysis?", level: 2 },
  { id: "step-variables", label: "Step 1: Variables", level: 2 },
  { id: "step-settings", label: "Step 2: Settings", level: 2 },
  { id: "step-validation", label: "Step 3: Validation", level: 2 },
];

export default function RunningAnalysisOverviewPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Overview</h1>
            <p className="text-lg text-muted-foreground">
            Running statistical analyses step by step
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Every analysis follows a structured 3-step process: select variables, configure settings, and validate assumptions before running."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Variables. Settings. Validation.
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
                Running Analysis is the process of <strong className="text-foreground">executing a statistical test or model</strong> on your data. Once you've prepared your data and selected which analysis method to use, you go through three key steps before getting results.
            </p>
            <p>
                These three steps ensure that your analysis is set up correctly, uses the right variables, and meets all necessary statistical requirements. This structured approach helps prevent common mistakes and produces reliable results.
            </p>
            <p>
                Whether you're running a simple t-test or a complex regression model, every analysis follows this same workflow for consistency and quality control.
            </p>
            </div>

            <div className="mt-8 grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <Variable className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Variables</h3>
                <p className="text-sm text-muted-foreground">Select which columns to use in your analysis</p>
              </div>
              <div className="p-4 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <Settings2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Settings</h3>
                <p className="text-sm text-muted-foreground">Configure parameters and options for the test</p>
              </div>
              <div className="p-4 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Validation</h3>
                <p className="text-sm text-muted-foreground">Verify data meets statistical requirements</p>
              </div>
            </div>
        </section>

        {/* STEP 1: VARIABLES */}
        <section id="step-variables" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Variable className="w-7 h-7 text-primary" />
            Step 1: Variables
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                The first step is selecting which variables (columns) from your dataset will be used in the analysis. Different analyses require different types and numbers of variables.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">Understanding Variable Roles</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg border">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Dependent Variable (Outcome)</h4>
                      <p className="text-sm text-muted-foreground">
                        The variable you're trying to predict, explain, or measure the effect on. Also called the response or target variable.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        <strong>Example:</strong> In a study of factors affecting test scores, "Test Score" would be the dependent variable.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-lg border">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Database className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Independent Variables (Predictors)</h4>
                      <p className="text-sm text-muted-foreground">
                        The variables you think might influence or predict the dependent variable. Also called explanatory variables, features, or predictors.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        <strong>Example:</strong> "Study Hours", "Sleep Quality", "Previous GPA" might be independent variables affecting test scores.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Variable Types</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The system automatically detects variable types, but understanding them helps you choose the right analysis.
                </p>
                <div className="space-y-3">
                  {VARIABLE_TYPES.map((type, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <type.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{type.label}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{type.description}</p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Examples:</strong> {type.examples}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            

              <div>
                <h3 className="text-xl font-semibold mb-4">Variable Roles in Different Analyses</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Beyond basic types, each analysis assigns specific roles to variables. The same variable can play different roles depending on which analysis you're running.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Outcome / Target</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        The variable you're trying to predict or explain. Used in regression, classification, and prediction analyses.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Example:</strong> "Sales Amount" in predicting sales, "Disease Status" in medical diagnosis
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Group</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        A categorical variable that divides your data into separate groups for comparison.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Example:</strong> "Treatment Group" (Control vs Experimental), "Department" (Sales, Marketing, Engineering)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Sliders className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Factor</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        A categorical independent variable in ANOVA or experimental designs. Can have multiple levels.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Example:</strong> "Fertilizer Type" (Type A, B, C), "Teaching Method" (Lecture, Discussion, Online)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Scale / Metric</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        A continuous numeric variable used for measurement or as a predictor in regression.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Example:</strong> "Age", "Income", "Temperature", "Test Score"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Variable className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Covariate</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        A continuous variable you want to control for or adjust in your analysis (common in ANCOVA).
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Example:</strong> "Baseline Score" when comparing post-treatment scores, "Age" when controlling for age effects
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Hash className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">ID / Identifier</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        A unique identifier for each observation. Not used in calculations but helpful for tracking data.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Example:</strong> "Patient ID", "Employee Number", "Transaction ID"
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-2">How to Select Variables</p>
                    <ul className="text-sm text-sky-700 dark:text-sky-300 space-y-1">
                      <li>• Use dropdown menus to select dependent and independent variables</li>
                      <li>• You can select multiple independent variables for most analyses</li>
                      <li>• Some analyses (like correlation) let you select multiple variables without designating dependent/independent</li>
                      <li>• The interface will guide you based on which analysis you've chosen</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* STEP 2: SETTINGS */}
        <section id="step-settings" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Settings2 className="w-7 h-7 text-primary" />
            Step 2: Settings
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Settings allow you to customize how the analysis runs. Each analysis has different options, but you'll see some settings appear across multiple analyses.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">Settings by Analysis Type</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* General Statistical Settings */}
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <Sliders className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-lg">General Statistical Settings</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Common across most hypothesis tests</p>
                    <div className="space-y-3">
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Alpha Level</h5>
                        <p className="text-xs text-muted-foreground">0.01, 0.05, 0.10</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Confidence Interval</h5>
                        <p className="text-xs text-muted-foreground">90%, 95%, 99%</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Post-hoc Tests</h5>
                        <p className="text-xs text-muted-foreground">Tukey, Bonferroni, Scheffé</p>
                      </div>
                    </div>
                  </div>

                  {/* Regression Settings */}
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-lg">Regression</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Linear & multiple regression</p>
                    <div className="space-y-3">
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Include Intercept</h5>
                        <p className="text-xs text-muted-foreground">Fit model with y-intercept</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Standardize Coefficients</h5>
                        <p className="text-xs text-muted-foreground">Show beta coefficients</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Robust Standard Errors</h5>
                        <p className="text-xs text-muted-foreground">Heteroscedasticity-robust SE</p>
                      </div>
                    </div>
                  </div>

                  {/* Clustering Settings */}
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <Layers className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-lg">Clustering (K-Means)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Unsupervised grouping</p>
                    <div className="space-y-3">
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Number of Clusters (k)</h5>
                        <p className="text-xs text-muted-foreground">How many groups</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Initialization Method</h5>
                        <p className="text-xs text-muted-foreground">k-means++, random</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Maximum Iterations</h5>
                        <p className="text-xs text-muted-foreground">Refinement cycles</p>
                      </div>
                    </div>
                  </div>

                  {/* Factor Analysis Settings */}
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <Database className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-lg">Factor Analysis</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Dimensionality reduction</p>
                    <div className="space-y-3">
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Number of Factors</h5>
                        <p className="text-xs text-muted-foreground">Underlying dimensions</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Rotation Method</h5>
                        <p className="text-xs text-muted-foreground">Varimax, Promax, None</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Extraction Method</h5>
                        <p className="text-xs text-muted-foreground">Principal Axis, ML</p>
                      </div>
                    </div>
                  </div>

                  {/* Time Series Settings */}
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <Calendar className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-lg">Time Series</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Temporal data forecasting</p>
                    <div className="space-y-3">
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Forecast Horizon</h5>
                        <p className="text-xs text-muted-foreground">Periods ahead to predict</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Seasonal Period</h5>
                        <p className="text-xs text-muted-foreground">Pattern length (e.g., 12)</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Trend Component</h5>
                        <p className="text-xs text-muted-foreground">Additive, Multiplicative</p>
                      </div>
                    </div>
                  </div>

                  {/* Predictive Modeling Settings */}
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-4">
                      <Target className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-lg">Predictive Modeling</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Machine learning & prediction</p>
                    <div className="space-y-3">
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Train/Test Split</h5>
                        <p className="text-xs text-muted-foreground">70/30, 80/20 ratio</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Cross-Validation</h5>
                        <p className="text-xs text-muted-foreground">K-fold validation (3, 5, 10)</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <h5 className="font-medium text-sm mb-1">Performance Metrics</h5>
                        <p className="text-xs text-muted-foreground">RMSE, MAE, R², Accuracy</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Don't Worry About Getting Settings Perfect</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Most settings have sensible defaults. If you're unsure, stick with the default values. You can always re-run the analysis with different settings later. Each setting includes a help tooltip explaining what it does.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* STEP 3: VALIDATION */}
        <section id="step-validation" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-primary" />
            Step 3: Validation
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Before running the analysis, the system automatically checks whether your data meets the necessary requirements and statistical assumptions. This validation step helps ensure reliable results and alerts you to potential issues.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">What Gets Validated</h3>
                <div className="space-y-6">
                  {VALIDATION_CHECKS.map((category, index) => (
                    <div key={index} className="p-5 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <category.icon className="w-5 h-5 text-primary" />
                        </div>
                        <h4 className="font-semibold text-lg">{category.title}</h4>
                      </div>
                      <ul className="space-y-2">
                        {category.checks.map((check, checkIndex) => (
                          <li key={checkIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span>{check}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
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
                        All checks passed. Your data meets the requirements and you can proceed with confidence.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">⚠ Warning</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Some assumptions are violated, but you can still proceed. Results should be interpreted with caution, and alternative methods may be suggested.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800 dark:text-red-200 mb-1">✗ Fail</p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Critical requirements not met. You must fix these issues before running the analysis (e.g., insufficient sample size, wrong variable types).
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
                  The validation screen will tell you exactly what's wrong and how to fix it. Common solutions include: selecting different variables, collecting more data, using a different analysis method, or transforming your variables. You can also view suggested alternative analyses that might work better for your data.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Note on missing data:</strong> If the validation detects missing values in your selected variables, you'll see a warning. When you run the analysis, rows with missing values are automatically removed (listwise deletion). The system will show you how many observations remain after removing missing data.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                  <strong className="text-foreground">Need to handle missing data differently?</strong> Use the <strong>Data Transformation</strong> tool to impute missing values (mean, median, mode) or create custom rules before running your analysis. You can also use Data Transformation for log transforms, standardization, or creating new variables.
                </p>
              </div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}

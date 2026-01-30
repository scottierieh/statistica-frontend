'use client';

import React from 'react';
import {
  Wand2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Hash,
  Calculator,
  Sparkles,
  Info,
  BarChart3,
  Zap,
  ArrowUpDown,
  Lightbulb,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "math-transforms", label: "Mathematical Transformations", level: 2 },
  { id: "normalization", label: "Normalization", level: 2 },
  { id: "one-hot-encoding", label: "One-Hot Encoding", level: 2 },
  { id: "best-practices", label: "Transformation Best Practices", level: 2 },
];

export default function DataPrepTransformingPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Transforming Data</h1>
            <p className="text-lg text-muted-foreground">
            Apply mathematical operations and encode categorical variables
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Transform your data to meet modeling requirements. Apply mathematical functions to normalize distributions, scale features for machine learning, and convert categorical variables to numeric format—all without writing code."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Transform. Scale. Encode.
            </p>
            </blockquote>
        </div>

        {/* MATH TRANSFORMS */}
        <section id="math-transforms" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Calculator className="w-7 h-7 text-primary" />
            Mathematical Transformations
            </h2>

            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Apply mathematical functions to numeric columns to normalize distributions, handle skewness, or prepare data for modeling.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Available Transformations</h3>
                
                <div className="space-y-4">
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Natural Log (ln)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Applies natural logarithm to reduce right skewness and compress large values. Only works on positive values.
                    </p>
                    <div className="p-3 bg-background rounded border mb-2">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Formula:</strong> ln(x)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong className="text-foreground">Example:</strong> [1, 10, 100, 1000] → [0, 2.30, 4.61, 6.91]
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">When to use:</strong> Right-skewed distributions (income, population, prices), exponential growth data
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Log Base 10 (log10)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Applies base-10 logarithm. Similar to natural log but easier to interpret (each unit = 10x change).
                    </p>
                    <div className="p-3 bg-background rounded border mb-2">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Formula:</strong> log₁₀(x)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong className="text-foreground">Example:</strong> [1, 10, 100, 1000] → [0, 1, 2, 3]
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">When to use:</strong> Data spanning multiple orders of magnitude (pH, earthquake magnitude)
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calculator className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Square Root (√)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Takes square root to reduce moderate right skewness. Less aggressive than logarithm. Works on non-negative values.
                    </p>
                    <div className="p-3 bg-background rounded border mb-2">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Formula:</strong> √x
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong className="text-foreground">Example:</strong> [4, 16, 64, 256] → [2, 4, 8, 16]
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">When to use:</strong> Moderately skewed distributions, count data
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Hash className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Square (x²)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Squares each value to increase variance and emphasize larger values. Opposite effect of square root.
                    </p>
                    <div className="p-3 bg-background rounded border mb-2">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Formula:</strong> x²
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong className="text-foreground">Example:</strong> [2, 4, 6, 8] → [4, 16, 36, 64]
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">When to use:</strong> Create polynomial features, emphasize extreme values
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Absolute Value (abs)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Converts all values to positive by removing negative signs. Distance from zero.
                    </p>
                    <div className="p-3 bg-background rounded border mb-2">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Formula:</strong> |x|
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong className="text-foreground">Example:</strong> [-10, -5, 0, 5, 10] → [10, 5, 0, 5, 10]
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">When to use:</strong> When direction doesn't matter (errors, deviations)
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calculator className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Round</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Rounds values to nearest integer. Simplifies data and removes decimal precision.
                    </p>
                    <div className="p-3 bg-background rounded border mb-2">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Formula:</strong> round(x)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong className="text-foreground">Example:</strong> [1.2, 2.5, 3.7, 4.9] → [1, 3, 4, 5]
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">When to use:</strong> Simplify overly precise data, create integer features
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">How to Apply Transformations</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <p className="text-muted-foreground">
                      Select numeric column(s) using header checkboxes
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <p className="text-muted-foreground">
                      Choose transformation from "Transform" dropdown in sidebar
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <p className="text-muted-foreground">
                      Click "Apply" button
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      4
                    </div>
                    <p className="text-muted-foreground">
                      Values update in place, rounded to 4 decimal places for readability
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Important Notes</p>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                      <li>• Transformations modify values in place—original data is replaced</li>
                      <li>• Log and sqrt fail on negative values (result becomes null)</li>
                      <li>• All transforms create undo history entries</li>
                      <li>• Multiple columns can be transformed simultaneously</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* NORMALIZATION */}
        <section id="normalization" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <ArrowUpDown className="w-7 h-7 text-primary" />
            Normalization
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Scale numeric features to a common range or distribution. Essential for machine learning algorithms that are sensitive to feature magnitude.
            </p>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="p-5 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="font-semibold text-lg">Z-Score (Standardization)</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Transforms data to have mean = 0 and standard deviation = 1. Each value shows how many standard deviations away from the mean.
                  </p>
                  <div className="p-3 bg-background rounded border mb-2">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Formula:</strong> z = (x - μ) / σ
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong className="text-foreground">Example:</strong> [10, 20, 30, 40, 50] → [-1.41, -0.71, 0, 0.71, 1.41]
                    </p>
                  </div>
                  <div className="space-y-2 mt-3">
                    <div className="p-2 bg-sky-50 dark:bg-sky-950/20 rounded">
                      <p className="text-xs text-sky-700 dark:text-sky-300">
                        <strong>When to use:</strong> Neural networks, algorithms sensitive to scale (SVM, k-NN), when data is normally distributed
                      </p>
                    </div>
                    <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded">
                      <p className="text-xs text-green-700 dark:text-green-300">
                        <strong>Pros:</strong> Preserves outliers, works well with normal distributions
                      </p>
                    </div>
                    <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded">
                      <p className="text-xs text-red-700 dark:text-red-300">
                        <strong>Cons:</strong> Sensitive to outliers (they affect mean/std)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <ArrowUpDown className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="font-semibold text-lg">Min-Max Scaling</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Scales values to a fixed range, typically [0, 1]. Preserves the original distribution shape but compresses to a standard range.
                  </p>
                  <div className="p-3 bg-background rounded border mb-2">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Formula:</strong> x' = (x - min) / (max - min)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong className="text-foreground">Example:</strong> [10, 20, 30, 40, 50] → [0, 0.25, 0.5, 0.75, 1.0]
                    </p>
                  </div>
                  <div className="space-y-2 mt-3">
                    <div className="p-2 bg-sky-50 dark:bg-sky-950/20 rounded">
                      <p className="text-xs text-sky-700 dark:text-sky-300">
                        <strong>When to use:</strong> Neural networks with bounded activation functions, image processing, when you need fixed [0,1] range
                      </p>
                    </div>
                    <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded">
                      <p className="text-xs text-green-700 dark:text-green-300">
                        <strong>Pros:</strong> Bounded range, preserves zero values, good for neural networks
                      </p>
                    </div>
                    <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded">
                      <p className="text-xs text-red-700 dark:text-red-300">
                        <strong>Cons:</strong> Very sensitive to outliers (one extreme value affects all others)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Choosing Between Z-Score and Min-Max</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Use Z-Score When:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Data is approximately normally distributed</li>
                      <li>• You want to preserve outlier information</li>
                      <li>• Using algorithms like SVM or logistic regression</li>
                      <li>• Comparing features with different units</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Use Min-Max When:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• You need values in a specific range [0,1]</li>
                      <li>• Data has bounded values already</li>
                      <li>• Using neural networks or image data</li>
                      <li>• Outliers have been removed already</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* ONE-HOT ENCODING */}
        <section id="one-hot-encoding" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-primary" />
            One-Hot Encoding
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Convert categorical variables (text) to numeric format by creating binary columns for each category. Required for most machine learning algorithms.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">What is One-Hot Encoding?</h3>
                <p className="text-muted-foreground mb-4">
                  Transforms a categorical column with N unique values into N binary (0/1) columns. Each original category gets its own column.
                </p>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm font-semibold mb-2">Example:</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold mb-1">Original Column: City</p>
                      <div className="p-2 bg-background rounded border text-xs font-mono">
                        ["NYC", "LA", "NYC", "SF", "LA"]
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-1">After One-Hot Encoding:</p>
                      <div className="p-2 bg-background rounded border text-xs font-mono space-y-1">
                        <div>City_NYC: [1, 0, 1, 0, 0]</div>
                        <div>City_LA:  [0, 1, 0, 0, 1]</div>
                        <div>City_SF:  [0, 0, 0, 1, 0]</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">How to Apply One-Hot Encoding</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <p className="text-muted-foreground">
                      Select categorical column(s) you want to encode
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <p className="text-muted-foreground">
                      Click "One-Hot Encoding" button in Transform section
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <p className="text-muted-foreground">
                      Configure options in the dialog (see options below)
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      4
                    </div>
                    <p className="text-muted-foreground">
                      Click "Apply Encoding" to create new binary columns
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Encoding Options</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-start gap-3 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">Drop First Category</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          Creates N-1 columns instead of N to avoid multicollinearity (dummy variable trap).
                        </p>
                        <p className="text-xs text-sky-700 dark:text-sky-300">
                          <strong>When to enable:</strong> Preparing for linear regression or logistic regression
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <div className="flex items-start gap-3 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">Keep Original Column</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          Preserves the original categorical column alongside the new binary columns.
                        </p>
                        <p className="text-xs text-sky-700 dark:text-sky-300">
                          <strong>When to enable:</strong> You want to keep the original for reference or future use
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <div className="flex items-start gap-3 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">Column Prefix (Optional)</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          Custom prefix for new column names. Defaults to original column name if left empty.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Example:</strong> Prefix "location" creates "location_NYC", "location_LA" instead of "City_NYC", "City_LA"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Important Limits</p>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                      <li>• Columns with {'>'} 50 unique values are skipped (too many categories)</li>
                      <li>• Missing values are excluded from encoding</li>
                      <li>• New columns are inserted next to original (or replace it if not keeping)</li>
                      <li>• All new columns have type "Number" automatically</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Use Case Example</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      You have a "Status" column with values ["Active", "Inactive", "Pending"]. After one-hot encoding, 
                      you get Status_Active, Status_Inactive, Status_Pending columns—each with 1 or 0 values. 
                      These can now be used in regression or neural network models.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* BEST PRACTICES */}
        <section id="best-practices" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            Transformation Best Practices
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Understand Your Data First
                </h3>
                <p className="text-sm text-muted-foreground">
                  Use column statistics to understand distribution before transforming. Check for skewness, outliers, and range. 
                  Log transforms work on right-skewed data, z-score on normal distributions.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Test on Sample First
                </h3>
                <p className="text-sm text-muted-foreground">
                  If unsure which transform to use, create a copy of your data (upload same file twice) and test different transforms 
                  in parallel to compare results.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Document Your Transformations
                </h3>
                <p className="text-sm text-muted-foreground">
                  Keep notes on which transforms you applied to which columns. When exporting, consider renaming columns 
                  to reflect transforms (e.g., "price" → "price_log", "age" → "age_zscore").
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Handle Missing Values Before Transforming
                </h3>
                <p className="text-sm text-muted-foreground">
                  Fill or remove missing values before applying transforms. Log and sqrt operations will fail on null values.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Order Matters: Clean → Transform → Encode
                </h3>
                <p className="text-sm text-muted-foreground">
                  Recommended workflow: (1) Fill missing values and remove duplicates, (2) Apply math transforms and normalization, 
                  (3) One-hot encode categorical variables last. This prevents errors and ensures clean input for each step.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Use Undo Liberally
                </h3>
                <p className="text-sm text-muted-foreground">
                  Every transformation creates an undo entry. Don't be afraid to experiment—press Ctrl+Z if a transform doesn't work as expected. 
                  You have 50 undo levels per tab.
                </p>
              </div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}
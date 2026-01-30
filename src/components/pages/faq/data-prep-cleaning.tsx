'use client';

import React from 'react';
import {
  Eraser,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Hash,
  Type,
  Calendar,
  XCircle,
  Search,
  Sparkles,
  BarChart3,
  Eye,
  Info,
  Calculator,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "missing-values", label: "Handling Missing Values", level: 2 },
  { id: "duplicates", label: "Finding & Removing Duplicates", level: 2 },
  { id: "column-types", label: "Column Type Validation", level: 2 },
  { id: "statistics", label: "Data Quality Statistics", level: 2 },
];

export default function DataPrepCleaningPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Cleaning Data</h1>
            <p className="text-lg text-muted-foreground">
            Handle missing values, remove duplicates, and validate data quality
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Clean data is the foundation of reliable analysis. Fill missing values with statistical methods, identify and remove duplicates, and ensure column types match your data—all with visual feedback and automatic quality checks."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Identify. Clean. Validate.
            </p>
            </blockquote>
        </div>

        {/* MISSING VALUES */}
        <section id="missing-values" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Eraser className="w-7 h-7 text-primary" />
            Handling Missing Values
            </h2>

            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Missing values (nulls, empty cells) can break analysis or produce misleading results. Data Preparation provides multiple methods to fill gaps intelligently.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Identifying Missing Values</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Visual Indicators</p>
                      <p className="text-sm text-muted-foreground">
                        Empty cells show with a light red/pink background, making missing data instantly visible across your dataset.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <BarChart3 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Column Statistics</p>
                      <p className="text-sm text-muted-foreground">
                        Each column header shows missing value count when statistics are enabled. Example: "5 missing" in red text.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Dataset Summary</p>
                      <p className="text-sm text-muted-foreground">
                        Header card shows total missing values across entire dataset as a red badge (e.g., "15 missing values").
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Fill Methods</h3>
                <p className="text-muted-foreground mb-4">
                  Select columns with missing data, choose a fill method from the dropdown, then click "Fill Missing" to apply.
                </p>

                <div className="space-y-4">
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calculator className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Mean</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Fills missing values with the average of all non-null values. Best for numeric columns with normal distribution.
                    </p>
                    <div className="p-3 bg-background rounded border mb-2">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Example:</strong> [10, 20, null, 30] → Mean = 20 → [10, 20, 20, 30]
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">When to use:</strong> Numeric data, symmetric distributions
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Median</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Fills with the middle value when sorted. More robust to outliers than mean.
                    </p>
                    <div className="p-3 bg-background rounded border mb-2">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Example:</strong> [10, 20, null, 100] → Median = 20 → [10, 20, 20, 100]
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">When to use:</strong> Numeric data with outliers or skewed distributions
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Mode</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Fills with the most frequently occurring value. Works for both numeric and text.
                    </p>
                    <div className="p-3 bg-background rounded border mb-2">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Example:</strong> ["A", "B", "A", null, "A"] → Mode = "A" → ["A", "B", "A", "A", "A"]
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">When to use:</strong> Categorical data (status, category, city)
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Hash className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Zero</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Fills all missing values with 0 (numeric) or empty string (text).
                    </p>
                    <div className="p-3 bg-background rounded border mb-2">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Example:</strong> [10, null, 30] → [10, 0, 30]
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">When to use:</strong> When missing means "zero" (counts, clicks)
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ArrowRight className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Forward Fill</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Copies the last non-null value forward to fill gaps.
                    </p>
                    <div className="p-3 bg-background rounded border mb-2">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Example:</strong> [100, null, null, 200] → [100, 100, 100, 200]
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">When to use:</strong> Time series (values persist forward)
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Backward Fill</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Copies the next non-null value backward to fill gaps.
                    </p>
                    <div className="p-3 bg-background rounded border mb-2">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Example:</strong> [100, null, null, 200] → [100, 200, 200, 200]
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">When to use:</strong> When future values apply backward
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Choose Wisely</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Different methods affect your analysis. Mean works for normal distributions, median for skewed data, mode for categories.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* DUPLICATES */}
        <section id="duplicates" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Search className="w-7 h-7 text-primary" />
            Finding & Removing Duplicates
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Duplicate rows can skew statistics and waste storage. Identify and remove them based on entire row content.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Find Duplicates</h3>
                <p className="text-muted-foreground mb-4">
                  Click <strong className="text-foreground">"Find"</strong> button in Data Quality section. All duplicate rows are automatically selected.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Automatic Selection</p>
                      <p className="text-sm text-muted-foreground">
                        All rows that appear more than once are selected
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Count Display</p>
                      <p className="text-sm text-muted-foreground">
                        Toast shows how many duplicates found (e.g., "8 rows selected" or "No Duplicates")
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Remove Duplicates</h3>
                <p className="text-muted-foreground mb-4">
                  Click <strong className="text-foreground">"Remove"</strong> button to keep first occurrence and delete subsequent duplicates.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">First Kept</p>
                      <p className="text-sm text-muted-foreground">
                        First occurrence kept, all duplicates removed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Undoable</p>
                      <p className="text-sm text-muted-foreground">
                        Creates history entry—press Ctrl+Z if mistake
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Duplicate Detection</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      Two rows are duplicates if ALL cells match exactly. Even one different value makes rows unique.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* COLUMN TYPES */}
        <section id="column-types" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-primary" />
            Column Type Validation
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Correct column types ensure proper sorting, transformations, and operations.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Available Types</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">Auto</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">Automatically detects type from content</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Type className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">Text</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">String values, alphabetical sort</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">Number</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">Numeric values, enables math transforms</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">Date</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">Date values, chronological sort</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Change Type</h3>
                <p className="text-muted-foreground">
                  Click column menu (⋮) → Hover "Type" → Select type
                </p>
              </div>
            </div>
        </section>

        {/* STATISTICS */}
        <section id="statistics" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-primary" />
            Data Quality Statistics
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Real-time statistics help monitor data quality at a glance.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Column Statistics</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">Type Badge:</strong> Shows detected/set type
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">Missing Count:</strong> Red text shows nulls
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">Min/Max/Mean:</strong> For numeric columns
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">Unique Count:</strong> Number of distinct values
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Toggle Display</h3>
                <p className="text-muted-foreground">
                  Click "Show Stats" / "Hide Stats" button in header to toggle column statistics visibility.
                </p>
              </div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}
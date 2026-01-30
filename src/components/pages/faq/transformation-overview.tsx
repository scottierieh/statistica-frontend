'use client';

import React from 'react';
import {
  Database,
  Upload,
  Edit3,
  Eraser,
  Wand2,
  GitMerge,
  Download,
  BookOpen,
  CheckCircle2,
  Zap,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-is", label: "What is Data Preparation?", level: 2 },
  { id: "key-features", label: "Key Features", level: 2 },
  { id: "when-to-use", label: "When to Use", level: 2 },
  { id: "workflow", label: "Typical Workflow", level: 2 },
];

export default function DataPrepOverviewPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Overview</h1>
            <p className="text-lg text-muted-foreground">
            Clean, transform, and prepare your data for analysis
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Transform messy, incomplete data into analysis-ready datasets with powerful editing, cleaning, and transformation tools—all in an intuitive spreadsheet interface."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Load. Clean. Transform. Analyze.
            </p>
            </blockquote>
        </div>

        {/* WHAT IS */}
        <section id="what-is" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What is Data Preparation?
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                Data Preparation is a <strong className="text-foreground">visual data editing and cleaning tool</strong> that helps you prepare datasets for analysis. Whether you're dealing with missing values, inconsistent formats, or need to transform columns, this tool provides an Excel-like interface with powerful preprocessing capabilities.
            </p>
            <p>
                Unlike traditional spreadsheet software, Data Preparation is specifically designed for <strong className="text-foreground">analytical workflows</strong>. It combines the familiarity of spreadsheet editing with specialized data science operations like normalization, encoding, and advanced merging—making it easy to prepare data without writing code.
            </p>
            <p>
                Work with multiple datasets simultaneously using tabs, track every change with unlimited undo/redo, and export cleaned data in various formats ready for statistical analysis or machine learning.
            </p>
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-lg border bg-muted/30">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  Spreadsheet Interface
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Familiar Excel-like grid with drag-and-drop, inline editing, and visual cell selection. No learning curve—start editing immediately.
                </p>
              </div>
              <div className="p-6 rounded-lg border bg-muted/30">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Data Science Tools
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Advanced operations like one-hot encoding, normalization, SQL-style joins, and statistical transforms built right in.
                </p>
              </div>
            </div>
        </section>

        {/* KEY FEATURES */}
        <section id="key-features" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Zap className="w-7 h-7 text-primary" />
            Key Features
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Multi-Format File Support</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Load CSV, Excel (.xlsx, .xls), and JSON files with automatic format detection. Support for multiple files in separate tabs with drag-and-drop upload.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <Edit3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Flexible Editing</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Edit cells, headers, and structure directly in the grid. Add or delete rows and columns, rename headers, sort data, and search across all cells instantly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <Eraser className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Data Cleaning</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Handle missing values with mean, median, mode, forward/backward fill, or zero replacement. Find and remove duplicate rows. Set column types (text, number, date) with automatic type detection.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <Wand2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Data Transformation</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Apply mathematical transformations (log, sqrt, square, absolute, round) and normalization techniques (z-score, min-max). Convert categorical columns to numeric with one-hot encoding.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <GitMerge className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Advanced Merging</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Combine datasets using append (stack rows) or SQL-style joins (INNER, LEFT, RIGHT, FULL). Match datasets by key columns with flexible join operations.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <RefreshCw className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Unlimited Undo/Redo</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Every operation is tracked with up to 50 history steps per tab. Undo mistakes instantly with Ctrl+Z or redo with Ctrl+Shift+Z. Full operation history with descriptions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <Download className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Export Options</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Export cleaned data as CSV, Excel, or JSON. Preserve column types and formatting. Download with a single click (Ctrl+S for quick CSV export).
                  </p>
                </div>
              </div>
            </div>
        </section>

        {/* WHEN TO USE */}
        <section id="when-to-use" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-7 h-7 text-primary" />
            When to Use Data Preparation
            </h2>

            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Use Data Preparation whenever you need to <strong className="text-foreground">clean, transform, or restructure data</strong> before analysis.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base mb-1">Your data has missing values or inconsistencies</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Fill gaps with statistical methods, remove duplicates, or fix data type issues that would break analysis
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base mb-1">You need to transform columns for modeling</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Normalize numeric features, apply log transforms to skewed data, or encode categorical variables for machine learning
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base mb-1">You're combining data from multiple sources</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Merge datasets by matching key columns, append new records, or join tables like you would in SQL
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base mb-1">You want visual editing without coding</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Prefer Excel-like interface over writing Python/R scripts, but still need data science operations
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base mb-1">You need to explore and understand your data first</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    View column statistics, identify missing patterns, sort and filter to understand data quality before running analysis
                  </p>
                </div>
              </div>
            </div>
        </section>

        {/* WORKFLOW */}
        <section id="workflow" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Database className="w-7 h-7 text-primary" />
            Typical Workflow
            </h2>

            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                Most data preparation tasks follow a similar pattern. Here's a typical workflow:
            </p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <div className="w-0.5 flex-1 bg-border mt-3 min-h-[60px]"></div>
                </div>
                <div className="flex-1 pb-4">
                  <h3 className="font-semibold text-lg mb-2">Load Your Data</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Upload CSV, Excel, or JSON files. Use drag-and-drop for multiple files. Each file opens in a new tab so you can work with several datasets simultaneously.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <div className="w-0.5 flex-1 bg-border mt-3 min-h-[60px]"></div>
                </div>
                <div className="flex-1 pb-4">
                  <h3 className="font-semibold text-lg mb-2">Inspect & Understand</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Review column statistics (missing values, unique counts, min/max). Search through data to spot issues. Check column types are correctly detected.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <div className="w-0.5 flex-1 bg-border mt-3 min-h-[60px]"></div>
                </div>
                <div className="flex-1 pb-4">
                  <h3 className="font-semibold text-lg mb-2">Clean Data Quality Issues</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Fill missing values using appropriate methods. Remove duplicate rows. Fix column types. Delete unnecessary rows or columns.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    4
                  </div>
                  <div className="w-0.5 flex-1 bg-border mt-3 min-h-[60px]"></div>
                </div>
                <div className="flex-1 pb-4">
                  <h3 className="font-semibold text-lg mb-2">Transform Features</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Apply mathematical transformations (log, sqrt) to normalize distributions. Scale numeric columns with z-score or min-max. Encode categorical variables with one-hot encoding.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    5
                  </div>
                  <div className="w-0.5 flex-1 bg-border mt-3 min-h-[60px]"></div>
                </div>
                <div className="flex-1 pb-4">
                  <h3 className="font-semibold text-lg mb-2">Merge if Needed</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Combine multiple tabs by appending rows or joining on key columns. Match datasets from different sources to create comprehensive analysis tables.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    6
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Export & Analyze</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Download your cleaned dataset as CSV, Excel, or JSON. Use it directly in statistical analysis, strategic decision modules, or external tools.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-5 bg-primary/5 border-l-4 border-primary rounded">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Pro tip:</strong> Use Ctrl+Z liberally to experiment with different cleaning approaches. With 50 levels of undo history per tab, you can safely try various transformations and revert if they don't work out.
              </p>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}
'use client';

import React from 'react';
import {
  Lightbulb,
  Keyboard,
  BookOpen,
  CheckCircle2,
  Zap,
  Clock,
  Shield,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "keyboard-shortcuts", label: "Keyboard Shortcuts", level: 2 },
  { id: "productivity-tips", label: "Productivity Tips", level: 2 },
  { id: "common-workflows", label: "Common Workflows", level: 2 },
  { id: "best-practices", label: "Best Practices", level: 2 },
];

export default function DataPrepTipsShortcutsPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Tips & Shortcuts</h1>
            <p className="text-lg text-muted-foreground">
            Work faster with keyboard shortcuts and best practices
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Master keyboard shortcuts and proven workflows to clean and transform data efficiently. Learn from common patterns and avoid pitfalls to get professional results faster."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Learn. Optimize. Master.
            </p>
            </blockquote>
        </div>

        {/* KEYBOARD SHORTCUTS */}
        <section id="keyboard-shortcuts" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Keyboard className="w-7 h-7 text-primary" />
            Keyboard Shortcuts
            </h2>

            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Speed up your workflow with these essential keyboard shortcuts. Works on both Windows and Mac.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Essential Shortcuts</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="flex-shrink-0">
                      <kbd className="px-3 py-2 bg-background rounded border text-sm font-mono">Ctrl+Z</kbd>
                      <span className="text-xs text-muted-foreground block mt-1">Cmd+Z on Mac</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold mb-1">Undo</p>
                      <p className="text-sm text-muted-foreground">
                        Reverse the last operation. Works for fill, delete, transform, merge—everything except individual cell edits. 
                        50 levels of undo history per tab.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="flex-shrink-0">
                      <kbd className="px-3 py-2 bg-background rounded border text-sm font-mono">Ctrl+Shift+Z</kbd>
                      <span className="text-xs text-muted-foreground block mt-1">Cmd+Shift+Z on Mac</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold mb-1">Redo</p>
                      <p className="text-sm text-muted-foreground">
                        Reapply an operation you just undid. Move forward through undo history.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="flex-shrink-0">
                      <kbd className="px-3 py-2 bg-background rounded border text-sm font-mono">Ctrl+S</kbd>
                      <span className="text-xs text-muted-foreground block mt-1">Cmd+S on Mac</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold mb-1">Quick Export (CSV)</p>
                      <p className="text-sm text-muted-foreground">
                        Instantly download the current tab as CSV. Fastest way to save your work. Use frequently to avoid losing changes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="flex-shrink-0">
                      <kbd className="px-3 py-2 bg-background rounded border text-sm font-mono">Delete</kbd>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold mb-1">Delete Selected Rows</p>
                      <p className="text-sm text-muted-foreground">
                        Remove all currently selected rows. Must have at least one row selected. Creates undo history entry.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="flex-shrink-0">
                      <kbd className="px-3 py-2 bg-background rounded border text-sm font-mono">Escape</kbd>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold mb-1">Clear Selections</p>
                      <p className="text-sm text-muted-foreground">
                        Deselect all rows and columns. Also closes dialogs and cancels operations.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="flex-shrink-0">
                      <kbd className="px-3 py-2 bg-background rounded border text-sm font-mono">Ctrl+F</kbd>
                      <span className="text-xs text-muted-foreground block mt-1">Cmd+F on Mac</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold mb-1">Search Data</p>
                      <p className="text-sm text-muted-foreground">
                        Focus the search box to find values across all cells. Filters rows to show only matches.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Most Used Shortcuts</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      The three shortcuts you'll use constantly: <strong>Ctrl+Z</strong> (undo mistakes), 
                      <strong> Ctrl+S</strong> (save progress), and <strong>Escape</strong> (clear selections). 
                      Master these first.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* PRODUCTIVITY TIPS */}
        <section id="productivity-tips" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Clock className="w-7 h-7 text-primary" />
            Productivity Tips
            </h2>
            
            <div className="space-y-4">
              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-start gap-3 mb-2">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Use Sample Data to Learn</h3>
                    <p className="text-sm text-muted-foreground">
                      Before working on real data, load sample data and practice operations. Try different fill methods, transforms, 
                      and joins to understand what they do without risking your actual dataset.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-start gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Keep Statistics Visible While Cleaning</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable "Show Stats" to monitor missing values, unique counts, and data ranges as you clean. 
                      Watch missing counts drop to zero as you fill values. Hide stats later when you're done cleaning.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-start gap-3 mb-2">
                  <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Test Transformations on a Copy</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload the same file twice if you want to compare different cleaning approaches. 
                      Try log transform in Tab 1, z-score in Tab 2, then compare results before deciding which to export.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-start gap-3 mb-2">
                  <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Select Multiple Columns for Batch Operations</h3>
                    <p className="text-sm text-muted-foreground">
                      Don't fill or transform columns one at a time. Select all numeric columns at once, then apply z-score normalization 
                      to all simultaneously. Works for fill, transform, and encoding operations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-start gap-3 mb-2">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Export Intermediate Versions</h3>
                    <p className="text-sm text-muted-foreground">
                      Export your data after each major stage: raw data → cleaned data → transformed data → final merged data. 
                      This creates checkpoints you can return to if later steps don't work out.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-start gap-3 mb-2">
                  <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Use Descriptive Tab Names</h3>
                    <p className="text-sm text-muted-foreground">
                      Rename tabs to reflect their contents and state. Examples: "sales_raw", "sales_cleaned", "customers_demographics". 
                      This helps when merging and creates better export filenames.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-start gap-3 mb-2">
                  <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Review History Before Exporting</h3>
                    <p className="text-sm text-muted-foreground">
                      Click through the undo history (in sidebar) to see all operations you've performed. 
                      This helps verify you haven't missed any cleaning steps and documents your data preparation process.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* COMMON WORKFLOWS */}
        <section id="common-workflows" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Zap className="w-7 h-7 text-primary" />
            Common Workflows
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Here are proven workflows for common data preparation tasks. Follow these patterns to achieve professional results efficiently.
            </p>

            <div className="space-y-6">
              <div className="p-5 rounded-lg border bg-muted/30">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Workflow 1: Basic Data Cleaning
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">1.</span>
                    <p className="text-muted-foreground">Load CSV/Excel file</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">2.</span>
                    <p className="text-muted-foreground">Enable "Show Stats" to see data quality</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">3.</span>
                    <p className="text-muted-foreground">Check column types—fix any misdetections (numeric IDs → Text)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">4.</span>
                    <p className="text-muted-foreground">Find and remove duplicates</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">5.</span>
                    <p className="text-muted-foreground">Fill missing values (choose appropriate method per column)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">6.</span>
                    <p className="text-muted-foreground">Delete unnecessary columns if any</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">7.</span>
                    <p className="text-muted-foreground">Export as CSV (Ctrl+S)</p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Workflow 2: Preparing for Machine Learning
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">1.</span>
                    <p className="text-muted-foreground">Load data and perform basic cleaning (remove duplicates, handle missing)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">2.</span>
                    <p className="text-muted-foreground">One-hot encode categorical variables (drop first if using linear models)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">3.</span>
                    <p className="text-muted-foreground">Apply log/sqrt transform to skewed numeric features</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">4.</span>
                    <p className="text-muted-foreground">Normalize all numeric features (z-score for SVM/neural nets, min-max for specific cases)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">5.</span>
                    <p className="text-muted-foreground">Verify no missing values remain (check stats)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">6.</span>
                    <p className="text-muted-foreground">Export as CSV for use in Python/R</p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Workflow 3: Combining Multiple Data Sources
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">1.</span>
                    <p className="text-muted-foreground">Load all source files (each opens in a tab)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">2.</span>
                    <p className="text-muted-foreground">Clean each tab individually (fill missing, fix types, remove dupes)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">3.</span>
                    <p className="text-muted-foreground">Rename tabs descriptively (e.g., "transactions", "customers", "products")</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">4.</span>
                    <p className="text-muted-foreground">Decide merge strategy: Append (same structure) or Join (add columns by key)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">5.</span>
                    <p className="text-muted-foreground">Switch to target tab, click "Merge into this tab"</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">6.</span>
                    <p className="text-muted-foreground">Configure merge (select source tab, mode, join key if applicable)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">7.</span>
                    <p className="text-muted-foreground">Verify merged result (check row count, sample rows)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">8.</span>
                    <p className="text-muted-foreground">Export combined dataset</p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Workflow 4: Quick Data Exploration
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">1.</span>
                    <p className="text-muted-foreground">Load data file</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">2.</span>
                    <p className="text-muted-foreground">Enable "Show Stats" to see distributions</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">3.</span>
                    <p className="text-muted-foreground">Sort columns to find min/max values and outliers</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">4.</span>
                    <p className="text-muted-foreground">Search for specific values or patterns (Ctrl+F)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">5.</span>
                    <p className="text-muted-foreground">Check unique counts to identify categorical vs continuous columns</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">6.</span>
                    <p className="text-muted-foreground">Find duplicates to check data quality</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-primary min-w-[2rem]">7.</span>
                    <p className="text-muted-foreground">Note insights for later analysis (no export needed if just exploring)</p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* BEST PRACTICES */}
        <section id="best-practices" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            Best Practices
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">DO: Save Frequently with Ctrl+S</h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Export your work every 10-15 minutes. Browser tabs can crash unexpectedly and you'll lose all unsaved changes. 
                      Ctrl+S is instant—use it liberally.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">DO: Use Undo Liberally to Experiment</h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Don't be afraid to try operations. With 50 levels of undo, you can safely experiment with different approaches 
                      and Ctrl+Z back if they don't work. This is faster than careful planning.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">DO: Clean Before Transforming</h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Follow the order: (1) Remove duplicates, (2) Fill missing values, (3) Fix column types, (4) Transform/normalize, 
                      (5) Encode categoricals. Each step assumes previous steps are complete.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">DO: Check Statistics After Each Major Operation</h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      After filling missing values, verify missing count = 0. After normalization, check min/max match expected ranges. 
                      Statistics help catch mistakes immediately.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">DON'T: Forget Your Original Files Are Unchanged</h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Data Preparation works on copies in your browser. Your original uploaded files are never modified. 
                      If you want to keep your cleaned data, you MUST export it.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">DON'T: Apply Log Transform to Columns with Zeros or Negatives</h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Log and square root fail on non-positive values—they become null. If your data has zeros, add a small constant first 
                      (create new column with x+1), then apply log.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">DON'T: One-Hot Encode High-Cardinality Columns</h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Columns with 50+ unique values are automatically skipped, but manually avoid encoding columns with 20+ categories. 
                      This creates too many columns and makes models unwieldy. Use other encoding strategies instead.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">DON'T: Join on Non-Unique Keys Without Understanding Impact</h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      If your join key has duplicate values in either dataset, you'll get multiple matching rows (cartesian product). 
                      Always use unique keys like IDs. If keys aren't unique, expect row count to increase significantly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}
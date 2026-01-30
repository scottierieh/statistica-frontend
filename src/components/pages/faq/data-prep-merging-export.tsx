'use client';

import React from 'react';
import {
  GitMerge,
  Download,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Info,
  Layers,
  FileSpreadsheet,
  FileText,
  ArrowRight,
  Zap,
  Database,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "merging-tabs", label: "Merging Multiple Tabs", level: 2 },
  { id: "append-mode", label: "Append Mode", level: 2 },
  { id: "join-mode", label: "Join Mode (SQL-style)", level: 2 },
  { id: "exporting", label: "Exporting Data", level: 2 },
];

export default function DataPrepMergingExportPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Merging & Export</h1>
            <p className="text-lg text-muted-foreground">
            Combine datasets and export cleaned data
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Combine data from multiple sources with append or SQL-style joins, then export your cleaned dataset in CSV, Excel, or JSON format—ready for analysis or sharing."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Merge. Combine. Export.
            </p>
            </blockquote>
        </div>

        {/* MERGING TABS */}
        <section id="merging-tabs" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <GitMerge className="w-7 h-7 text-primary" />
            Merging Multiple Tabs
            </h2>

            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                When you have multiple datasets open in separate tabs, you can merge them into a single combined dataset using two different strategies: Append (stack rows) or Join (match by key column).
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">When to Merge Tabs</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Combining Data from Multiple Sources</p>
                      <p className="text-sm text-muted-foreground">
                        Example: Monthly sales files (Jan.csv, Feb.csv, Mar.csv) → Combine into one annual dataset
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Enriching Data with Additional Information</p>
                      <p className="text-sm text-muted-foreground">
                        Example: Customer transactions + Customer demographics → Add demographic info to each transaction
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Appending New Records</p>
                      <p className="text-sm text-muted-foreground">
                        Example: Historical data + New data → Grow your dataset with fresh records
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">How to Access Merge</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <p className="text-muted-foreground">
                      Have at least 2 tabs open (multiple files loaded)
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <p className="text-muted-foreground">
                      Switch to the tab you want to merge data <strong className="text-foreground">into</strong> (the target/destination tab)
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <p className="text-muted-foreground">
                      Click "Merge into this tab" button in the Merge Tabs section of the sidebar
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      4
                    </div>
                    <p className="text-muted-foreground">
                      Configure merge options in the dialog (see sections below)
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Target Tab Selection</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      The currently active tab becomes the target—data from other tabs will be merged INTO this tab. 
                      Choose carefully which tab should receive the merged data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* APPEND MODE */}
        <section id="append-mode" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Layers className="w-7 h-7 text-primary" />
            Append Mode
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Append mode <strong className="text-foreground">stacks rows</strong> from the source tab below the target tab's existing rows. Use this to combine datasets with the same structure.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">How Append Works</h3>
                <div className="p-5 rounded-lg border bg-muted/30">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold mb-2">Target Tab (Before):</p>
                      <div className="p-3 bg-background rounded border text-xs font-mono">
                        ID | Name | Age<br/>
                        1  | Alice| 25<br/>
                        2  | Bob  | 30
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowRight className="w-6 h-6 text-primary" />
                      <span className="text-sm font-semibold mx-2">APPEND</span>
                      <ArrowRight className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-2">Source Tab:</p>
                      <div className="p-3 bg-background rounded border text-xs font-mono">
                        ID | Name    | Age<br/>
                        3  | Charlie | 35<br/>
                        4  | Diana   | 28
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowRight className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-2">Target Tab (After):</p>
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800 text-xs font-mono">
                        ID | Name    | Age<br/>
                        1  | Alice   | 25<br/>
                        2  | Bob     | 30<br/>
                        3  | Charlie | 35<br/>
                        4  | Diana   | 28
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Column Matching</h3>
                <p className="text-muted-foreground mb-4">
                  Append mode matches columns by name. If column names differ between tabs, the behavior depends on matching:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Matching Column Names</p>
                      <p className="text-sm text-muted-foreground">
                        Data is placed in the corresponding column. Example: "Age" column in source → "Age" column in target
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Source Has Extra Columns</p>
                      <p className="text-sm text-muted-foreground">
                        New columns are automatically added to the target. Target's existing rows get null in these new columns.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Source Missing Columns</p>
                      <p className="text-sm text-muted-foreground">
                        Appended rows have null values in columns that don't exist in the source
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">When to Use Append</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Combining Time Periods</h4>
                    <p className="text-xs text-muted-foreground">
                      Stack monthly or quarterly data files into one annual dataset
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Adding New Records</h4>
                    <p className="text-xs text-muted-foreground">
                      Append newly collected data to historical records
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Merging Similar Sources</h4>
                    <p className="text-xs text-muted-foreground">
                      Combine data from multiple regions/stores with same structure
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Growing Dataset</h4>
                    <p className="text-xs text-muted-foreground">
                      Incrementally add rows without complex matching logic
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* JOIN MODE */}
        <section id="join-mode" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Database className="w-7 h-7 text-primary" />
            Join Mode (SQL-style)
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Join mode <strong className="text-foreground">matches rows by a key column</strong> and combines columns from both datasets. Works like SQL joins—choose a join type based on which rows you want to keep.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Join Types</h3>
                
                <div className="space-y-4">
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Database className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">INNER JOIN</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Keep only rows where the key exists in BOTH datasets. Rows without matches in either dataset are excluded.
                    </p>
                    <div className="p-3 bg-background rounded border">
                      <p className="text-xs text-muted-foreground mb-2">
                        <strong className="text-foreground">Example:</strong>
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        Target has IDs [1, 2, 3]. Source has IDs [2, 3, 4].<br/>
                        Result: Only rows with IDs 2 and 3 (the intersection).
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong className="text-foreground">When to use:</strong> You only want complete records that exist in both datasets
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ArrowRight className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">LEFT JOIN</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Keep ALL rows from the target (left), add matching data from source. Unmatched target rows get nulls in source columns.
                    </p>
                    <div className="p-3 bg-background rounded border">
                      <p className="text-xs text-muted-foreground mb-2">
                        <strong className="text-foreground">Example:</strong>
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        Target has IDs [1, 2, 3]. Source has IDs [2, 3, 4].<br/>
                        Result: Rows 1, 2, 3. Row 1 has nulls for source columns.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong className="text-foreground">When to use:</strong> Target dataset is primary, enrich it with optional source data
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ArrowRight className="w-5 h-5 text-primary rotate-180" />
                      </div>
                      <h4 className="font-semibold text-lg">RIGHT JOIN</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Keep ALL rows from the source (right), add matching data from target. Unmatched source rows get nulls in target columns.
                    </p>
                    <div className="p-3 bg-background rounded border">
                      <p className="text-xs text-muted-foreground mb-2">
                        <strong className="text-foreground">Example:</strong>
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        Target has IDs [1, 2, 3]. Source has IDs [2, 3, 4].<br/>
                        Result: Rows 2, 3, 4. Row 4 has nulls for target columns.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong className="text-foreground">When to use:</strong> Source dataset is primary, enrich it with target data
                    </p>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Layers className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">FULL JOIN</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Keep ALL rows from BOTH datasets. Unmatched rows get nulls in columns from the other dataset.
                    </p>
                    <div className="p-3 bg-background rounded border">
                      <p className="text-xs text-muted-foreground mb-2">
                        <strong className="text-foreground">Example:</strong>
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        Target has IDs [1, 2, 3]. Source has IDs [2, 3, 4].<br/>
                        Result: Rows 1, 2, 3, 4. Row 1 has nulls for source, row 4 has nulls for target.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong className="text-foreground">When to use:</strong> Don't want to lose any data from either side
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Selecting Join Key</h3>
                <p className="text-muted-foreground mb-4">
                  The join key is the column used to match rows between datasets. Both datasets must have this column.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Column Must Exist in Both</p>
                      <p className="text-sm text-muted-foreground">
                        The dropdown only shows columns that appear in both target and source tabs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Matching is Exact</p>
                      <p className="text-sm text-muted-foreground">
                        Values must match exactly (case-sensitive). "ABC" ≠ "abc"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Common Key Columns</p>
                      <p className="text-sm text-muted-foreground">
                        ID, customer_id, user_id, order_id, date, email—any unique identifier
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Column Handling in Joins</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Key Column Appears Once</p>
                      <p className="text-sm text-muted-foreground">
                        The join key column appears only once in the result (not duplicated)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Source Columns Added</p>
                      <p className="text-sm text-muted-foreground">
                        All non-key columns from source are added to the right side of the result
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Duplicate Column Names Skipped</p>
                      <p className="text-sm text-muted-foreground">
                        If source has columns with same names as target (except key), they're not added to avoid conflicts
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Join Key Selection is Critical</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Choose the join key carefully. Using the wrong column (e.g., "Name" instead of "ID") can produce incorrect matches if names aren't unique. 
                      Always use unique identifiers when available.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* EXPORTING */}
        <section id="exporting" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Download className="w-7 h-7 text-primary" />
            Exporting Data
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Export your cleaned and transformed data to share with others or use in external tools. Three formats available.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Export Formats</h3>
                
                <div className="space-y-4">
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-6 h-6 text-primary" />
                      <h4 className="font-semibold text-lg">CSV (Comma-Separated Values)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Universal plain-text format. Opens in Excel, Google Sheets, and all data tools. UTF-8 encoded to preserve special characters.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <strong>Best for:</strong> General use, sharing with anyone, importing into other tools
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <strong>Pros:</strong> Universal compatibility, small file size, human-readable
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <strong>Cons:</strong> Loses some formatting, all values become text
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <FileSpreadsheet className="w-6 h-6 text-primary" />
                      <h4 className="font-semibold text-lg">Excel (.xlsx)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Microsoft Excel format. Preserves numeric types and formatting better than CSV. Opens in Excel, Google Sheets, and Numbers.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <strong>Best for:</strong> Business reporting, presentations, when formatting matters
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <strong>Pros:</strong> Preserves numbers vs text, widely used in business, clean appearance
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <strong>Cons:</strong> Larger file size than CSV, proprietary format
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-6 h-6 text-primary" />
                      <h4 className="font-semibold text-lg">JSON</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      JavaScript Object Notation. Structured data format for APIs, web applications, and programming. Each row becomes an object.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <strong>Best for:</strong> Web development, APIs, programming, modern data pipelines
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <strong>Pros:</strong> Preserves types (number, string, null), structured format, easy to parse
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <strong>Cons:</strong> Not human-readable, requires code to open, larger file size
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">How to Export</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Method 1: Quick CSV Export</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Press <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+S</kbd> (Windows) or <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Cmd+S</kbd> (Mac) 
                      to instantly download the current tab as CSV.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Method 2: Choose Format</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">In the sidebar:</p>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                          1
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Click the dropdown arrow next to "Download CSV" button
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                          2
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Select CSV, Excel, or JSON
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                          3
                        </div>
                        <p className="text-sm text-muted-foreground">
                          File downloads automatically with the same name as your tab
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Export Tips</h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Export Each Tab Separately
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Exports save the currently active tab. Switch tabs to export different datasets.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Rename Tabs Before Exporting
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Export filename comes from tab name. Rename tabs to get descriptive filenames (e.g., "customers_cleaned_2024.csv")
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Export Doesn't Modify Original
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Export creates a new file. Your original uploaded files remain unchanged—Data Preparation only works on copies in the browser.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Export After Every Major Change
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Save your work frequently by exporting. Browser tabs can close unexpectedly and you'll lose unsaved changes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Typical Workflow</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      Load data → Clean (fill missing, remove duplicates) → Transform (normalize, encode) → 
                      Merge (if needed) → Export as CSV/Excel → Use in analysis or modeling tools.
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
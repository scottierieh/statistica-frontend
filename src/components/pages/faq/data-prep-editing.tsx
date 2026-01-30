'use client';

import React from 'react';
import {
  Edit3,
  Type,
  Rows,
  Columns,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Trash2,
  BookOpen,
  CheckCircle2,
  SortAsc,
  SortDesc,
  Hash,
  Calendar,
  Sparkles,
  MousePointer2,
  Keyboard,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "cell-editing", label: "Cell Editing", level: 2 },
  { id: "header-editing", label: "Header Editing", level: 2 },
  { id: "row-operations", label: "Row Operations", level: 2 },
  { id: "column-operations", label: "Column Operations", level: 2 },
  { id: "sorting", label: "Sorting Data", level: 2 },
  { id: "selection", label: "Selection Techniques", level: 2 },
];

export default function DataPrepEditingPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Editing Data</h1>
            <p className="text-lg text-muted-foreground">
            Modify cells, rows, and columns in a spreadsheet interface
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Edit your data directly in a familiar spreadsheet grid. Click any cell to modify values, add or remove rows and columns, rename headers, and sort data—all with instant visual feedback."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Click. Edit. Done.
            </p>
            </blockquote>
        </div>

        {/* CELL EDITING */}
        <section id="cell-editing" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Edit3 className="w-7 h-7 text-primary" />
            Cell Editing
            </h2>

            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Edit individual cell values by clicking directly into any cell in the grid.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">How to Edit Cells</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Click any cell</p>
                      <p className="text-sm text-muted-foreground">Cell becomes editable with a text input field</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Type new value</p>
                      <p className="text-sm text-muted-foreground">Replace or modify the existing content</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Press Enter or click elsewhere</p>
                      <p className="text-sm text-muted-foreground">Change is saved immediately</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Cell Behaviors</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Empty Cells</p>
                      <p className="text-sm text-muted-foreground">
                        Delete all content to make a cell empty (null). Empty cells show as light red background to highlight missing data.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Automatic Type Detection</p>
                      <p className="text-sm text-muted-foreground">
                        When you edit a cell, the column type is re-evaluated. Numbers are stored as numbers, text as text.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Instant Updates</p>
                      <p className="text-sm text-muted-foreground">
                        Changes are reflected immediately in column statistics (min, max, mean, missing count).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">No Undo from Cell Edits</p>
                      <p className="text-sm text-muted-foreground">
                        Individual cell edits don't create history entries. Use Undo (Ctrl+Z) for bulk operations instead.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* HEADER EDITING */}
        <section id="header-editing" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Type className="w-7 h-7 text-primary" />
            Header Editing
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Column headers (the first row) can be renamed to make your data more understandable.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">How to Rename Headers</h3>
                <p className="text-muted-foreground mb-4">
                  Click directly on any column header text field and type a new name. The header updates immediately across all views and statistics.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Best Practices for Headers</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Use Descriptive Names
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      "Customer_Age" is clearer than "Col3"
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Avoid Special Characters
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Use underscores instead of spaces: "user_id" not "user id"
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Keep It Short
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Long headers make the interface crowded
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Be Consistent
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Use the same naming style (snake_case, camelCase) throughout
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* ROW OPERATIONS */}
        <section id="row-operations" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Rows className="w-7 h-7 text-primary" />
            Row Operations
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Add or remove rows to adjust your dataset structure.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Available Operations</h3>
                <div className="space-y-4">
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ArrowUp className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Add Row Above</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Inserts a new empty row above the currently selected row(s). Useful for adding data in the middle of your dataset.
                    </p>
                    <div className="p-3 bg-background rounded">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">How:</strong> Select row(s) → Click "Above" button in sidebar or Row Operations menu
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ArrowDown className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Add Row Below</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Inserts a new empty row below the currently selected row(s). Most common way to append new records.
                    </p>
                    <div className="p-3 bg-background rounded">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">How:</strong> Select row(s) → Click "Below" button in sidebar or Row Operations menu
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Trash2 className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Delete Selected Rows</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Removes all currently selected rows from the dataset. Creates an undo history entry.
                    </p>
                    <div className="p-3 bg-background rounded">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">How:</strong> Select row(s) → Click "Delete" button or press Delete key
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Keyboard className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Keyboard Shortcut</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      Press <kbd className="px-2 py-1 bg-white dark:bg-slate-800 rounded text-xs font-mono">Delete</kbd> key to quickly remove selected rows
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* COLUMN OPERATIONS */}
        <section id="column-operations" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Columns className="w-7 h-7 text-primary" />
            Column Operations
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Add or remove columns to restructure your dataset.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Available Operations</h3>
                <div className="space-y-4">
                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Add Column Left</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Inserts a new empty column to the left of the selected column(s). New column is named "Column N" where N is the next available number.
                    </p>
                    <div className="p-3 bg-background rounded">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">How:</strong> Select column(s) → Click "Left" button in sidebar or Column Operations menu
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ArrowRight className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Add Column Right</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Inserts a new empty column to the right of the selected column(s). Useful for adding calculated or derived columns.
                    </p>
                    <div className="p-3 bg-background rounded">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">How:</strong> Select column(s) → Click "Right" button in sidebar or Column Operations menu
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Trash2 className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg">Delete Selected Columns</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Removes all currently selected columns from the dataset. All data in those columns is permanently deleted (can be undone).
                    </p>
                    <div className="p-3 bg-background rounded">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">How:</strong> Select column(s) → Click "Delete" button in sidebar
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Column Type Management</h3>
                <p className="text-muted-foreground mb-4">
                  Each column has a data type that affects how values are sorted and processed. Click the menu icon (⋮) in any column header to change the type.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">Auto</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Automatically detects type based on content (default)
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Type className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">Text</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Treats all values as strings (alphabetical sort)
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">Number</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Numeric values (numeric sort, enables math transforms)
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">Date</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Date values (chronological sort)
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* SORTING */}
        <section id="sorting" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <SortAsc className="w-7 h-7 text-primary" />
            Sorting Data
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Reorder rows based on column values to analyze patterns or find specific records.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">How to Sort</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <p className="text-muted-foreground">
                      Click the menu icon (⋮) in any column header
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <p className="text-muted-foreground">
                      Choose "Sort Ascending" or "Sort Descending"
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <p className="text-muted-foreground">
                      All rows reorder based on that column's values
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Sort Behavior by Type</h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <SortAsc className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">Text Columns</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Alphabetical order (A-Z ascending, Z-A descending)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Example: Alice → Bob → Charlie (ascending)
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">Number Columns</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Numeric order (smallest to largest ascending, largest to smallest descending)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Example: 1 → 10 → 100 (ascending, not alphabetical)
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">Date Columns</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Chronological order (oldest to newest ascending, newest to oldest descending)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Example: 2020-01-01 → 2021-06-15 → 2023-12-31 (ascending)
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Null Values Behavior</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      Empty (null) cells always move to the end when sorting, regardless of ascending or descending order. 
                      This ensures missing data doesn't interfere with your sort logic.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* SELECTION */}
        <section id="selection" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <MousePointer2 className="w-7 h-7 text-primary" />
            Selection Techniques
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Selecting rows and columns is essential for bulk operations. Master these selection techniques for efficient editing.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Row Selection</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Single Row</p>
                      <p className="text-sm text-muted-foreground">
                        Click the checkbox at the left edge of any row
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Multiple Rows</p>
                      <p className="text-sm text-muted-foreground">
                        Click multiple row checkboxes to select several rows at once
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Select All Rows</p>
                      <p className="text-sm text-muted-foreground">
                        Click the checkbox in the top-left corner (header row) to select all visible rows
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Deselect All</p>
                      <p className="text-sm text-muted-foreground">
                        Click the header checkbox again or press Escape key
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Column Selection</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Single Column</p>
                      <p className="text-sm text-muted-foreground">
                        Click the checkbox in any column header
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Multiple Columns</p>
                      <p className="text-sm text-muted-foreground">
                        Click multiple column checkboxes to select several columns at once
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Visual Highlight</p>
                      <p className="text-sm text-muted-foreground">
                        Selected columns show with a light background color for easy identification
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Selection Indicators</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Selection Count Badges</h4>
                    <p className="text-xs text-muted-foreground">
                      Sidebar shows "N rows selected" or "N cols selected" when items are selected
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Visual Highlighting</h4>
                    <p className="text-xs text-muted-foreground">
                      Selected rows/columns show with colored background to clearly indicate selection
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Operation Buttons Enable</h4>
                    <p className="text-xs text-muted-foreground">
                      Add, delete, and transform buttons become active only when selections exist
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Clear with Escape</h4>
                    <p className="text-xs text-muted-foreground">
                      Press Escape key anytime to clear all row and column selections
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Keyboard className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Keyboard Shortcut</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Press <kbd className="px-2 py-1 bg-white dark:bg-slate-800 rounded text-xs font-mono">Escape</kbd> to quickly clear all selections
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
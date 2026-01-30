'use client';

import React from 'react';
import {
  Upload,
  FileSpreadsheet,
  Sparkles,
  Download,
  BookOpen,
  CheckCircle2,
  Info,
  AlertCircle,
  Folder,
  Plus,
  X,
  Eye,
  Layers,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "file-formats", label: "Supported File Formats", level: 2 },
  { id: "uploading", label: "Uploading Files", level: 2 },
  { id: "sample-data", label: "Sample Data", level: 2 },
  { id: "multi-tab", label: "Working with Multiple Tabs", level: 2 },
  { id: "tips", label: "Loading Tips", level: 2 },
];

export default function DataPrepLoadingPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Loading Data</h1>
            <p className="text-lg text-muted-foreground">
            Import files and manage multiple datasets
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Load data from CSV, Excel, or JSON files with automatic format detection. Work with multiple datasets simultaneously using tabs—just like your favorite spreadsheet software."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Upload. Open. Edit.
            </p>
            </blockquote>
        </div>

        {/* FILE FORMATS */}
        <section id="file-formats" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <FileSpreadsheet className="w-7 h-7 text-primary" />
            Supported File Formats
            </h2>

            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Data Preparation supports three common data file formats with automatic detection:
            </p>

            <div className="space-y-4">
              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-start gap-4 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <FileSpreadsheet className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">CSV / TSV</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Comma-separated values (.csv) or tab-separated values (.tsv, .txt)
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">Universal format supported by all spreadsheet and data tools</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">Automatic delimiter detection (comma, tab, semicolon)</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">First row automatically detected as headers</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-start gap-4 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <FileSpreadsheet className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Excel</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Microsoft Excel workbooks (.xlsx, .xls)
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">Reads the first worksheet automatically</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">Preserves numeric and text formatting</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">Handles both .xlsx (modern) and .xls (legacy) formats</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-lg border bg-muted/30">
                <div className="flex items-start gap-4 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <FileSpreadsheet className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">JSON</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      JavaScript Object Notation (.json)
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">Supports array of objects format (most common)</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">Supports {`{headers: [], rows: []}`} format</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">Automatically converts nested objects to flat tables</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">File Size Recommendations</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    For optimal performance, keep files under 50MB or 100,000 rows. Larger files may take longer to load and process. 
                    Consider splitting very large datasets into smaller chunks.
                  </p>
                </div>
              </div>
            </div>
        </section>

        {/* UPLOADING */}
        <section id="uploading" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Upload className="w-7 h-7 text-primary" />
            Uploading Files
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                There are three ways to upload files to Data Preparation:
            </p>

            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">Method 1: Click to Upload</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <p className="text-muted-foreground">
                      Click the <strong className="text-foreground">"Upload Files"</strong> button in the left sidebar or toolbar
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <p className="text-muted-foreground">
                      Select one or more files from your computer
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <p className="text-muted-foreground">
                      Files will open automatically in new tabs
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Method 2: Drag and Drop</h3>
                <div className="p-6 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                  <div className="flex flex-col items-center text-center">
                    <Upload className="w-12 h-12 text-primary/60 mb-3" />
                    <p className="font-medium mb-1">Drag files anywhere on the page</p>
                    <p className="text-sm text-muted-foreground">
                      Drop CSV, Excel, or JSON files directly into the interface. Multiple files supported.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  The easiest method—just drag files from your file explorer and drop them anywhere in the Data Preparation interface.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Method 3: Multiple File Upload</h3>
                <p className="text-muted-foreground mb-3">
                  You can select and upload multiple files at once using either click or drag-and-drop. Each file will open in its own tab.
                </p>
                <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Pro Tip</p>
                      <p className="text-sm text-sky-700 dark:text-sky-300">
                        Hold Ctrl (Windows) or Cmd (Mac) when selecting files to choose multiple files at once. 
                        Or use Shift to select a range of files.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">What Happens After Upload</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Format Detection</p>
                    <p className="text-sm text-muted-foreground">File format is automatically detected and parsed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Header Recognition</p>
                    <p className="text-sm text-muted-foreground">First row is identified as column headers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Type Inference</p>
                    <p className="text-sm text-muted-foreground">Column types (text, number, date) are automatically detected</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Tab Creation</p>
                    <p className="text-sm text-muted-foreground">Data opens in a new tab with the filename as the tab name</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Statistics Display</p>
                    <p className="text-sm text-muted-foreground">Column statistics show missing values, unique counts, and data ranges</p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* SAMPLE DATA */}
        <section id="sample-data" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-primary" />
            Sample Data
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Don't have data ready? Load sample data to explore features and learn how the tool works.
            </p>

            <div className="p-5 rounded-lg border bg-muted/30">
              <h3 className="font-semibold text-lg mb-3">What's in Sample Data?</h3>
              <p className="text-muted-foreground mb-4">
                A demonstration dataset with 10 rows and 7 columns showing typical data quality issues:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Mixed data types (text, numbers, categories)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Missing values to practice filling techniques</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Realistic column names (ID, Name, Age, City, Score, Grade, Status)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Perfect size for testing transformations and operations</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-3">How to Load Sample Data</h3>
              <p className="text-muted-foreground mb-4">
                Click the <strong className="text-foreground">"Sample Data"</strong> button in the sidebar. 
                Sample data opens in a new tab labeled "Sample Data" and is ready to edit immediately.
              </p>
            </div>

            <div className="mt-6 p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Perfect for Learning</p>
                  <p className="text-sm text-sky-700 dark:text-sky-300">
                    Sample data is ideal for testing operations without risking your real data. Try filling missing values, 
                    applying transformations, or practicing joins—all changes are temporary until you export.
                  </p>
                </div>
              </div>
            </div>
        </section>

        {/* MULTI-TAB */}
        <section id="multi-tab" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Layers className="w-7 h-7 text-primary" />
            Working with Multiple Tabs
            </h2>
            
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Data Preparation supports multiple datasets open simultaneously, each in its own tab—just like a web browser or Excel workbook.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Tab Features</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Folder className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Independent Workspaces</p>
                      <p className="text-sm text-muted-foreground">
                        Each tab is completely independent with its own data, history, and selections. 
                        Changes in one tab don't affect others.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Eye className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Visual Tab Bar</p>
                      <p className="text-sm text-muted-foreground">
                        Tab bar shows all open files with filenames. Active tab is highlighted. 
                        Click any tab to switch to that dataset instantly.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <X className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Close Tabs</p>
                      <p className="text-sm text-muted-foreground">
                        Click the X button on any tab to close it. Don't worry—you can always re-upload the file if needed.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Add New Tabs</p>
                      <p className="text-sm text-muted-foreground">
                        Click the + button in the tab bar or use the Upload Files button to open additional datasets.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Use Cases for Multiple Tabs</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Compare Datasets</h4>
                    <p className="text-xs text-muted-foreground">
                      Open related files (e.g., sales data from different months) and switch between them to spot differences
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Prepare for Merging</h4>
                    <p className="text-xs text-muted-foreground">
                      Clean and prepare multiple datasets separately before merging them together
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Test Different Approaches</h4>
                    <p className="text-xs text-muted-foreground">
                      Upload the same file twice and try different cleaning strategies in parallel
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Reference Data</h4>
                    <p className="text-xs text-muted-foreground">
                      Keep a lookup table or reference dataset open while working on your main data
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Memory Consideration</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Each tab uses browser memory. If you have many large files open (5+ files over 10MB each), 
                    performance may slow down. Close unused tabs to free up memory.
                  </p>
                </div>
              </div>
            </div>
        </section>

        {/* TIPS */}
        <section id="tips" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            Loading Tips
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Check Your Headers
                </h3>
                <p className="text-sm text-muted-foreground">
                  Make sure the first row of your file contains column names, not data. If headers are missing, 
                  the tool will auto-generate generic names (Column 1, Column 2, etc.) which you can rename later.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Use Consistent Encodings
                </h3>
                <p className="text-sm text-muted-foreground">
                  Save CSV files as UTF-8 to avoid character encoding issues with special characters (é, ñ, 中, etc.). 
                  Most modern tools use UTF-8 by default.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Start with Sample Data
                </h3>
                <p className="text-sm text-muted-foreground">
                  New to the tool? Load sample data first to explore features and understand the interface before working with your actual data.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Keep Backups
                </h3>
                <p className="text-sm text-muted-foreground">
                  Data Preparation doesn't modify your original files—changes only exist in the browser session. 
                  Export cleaned data to save your work.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Organize File Names
                </h3>
                <p className="text-sm text-muted-foreground">
                  Use descriptive filenames before uploading—they become tab names. 
                  "Sales_Q1_2024.csv" is more helpful than "data.csv" when you have multiple tabs open.
                </p>
              </div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}
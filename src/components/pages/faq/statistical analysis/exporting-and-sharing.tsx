'use client';

import React from 'react';
import {
  Download,
  FileText,
  Code,
  FileSpreadsheet,
  Image,
  CheckCircle2,
  BookOpen,
  Info,
  Presentation,
  FileCode,
  Share2,
  FileDown,
  BarChart3,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-is", label: "What is Export & Sharing?", level: 2 },
  { id: "word-export", label: "Word Report", level: 2 },
  { id: "python-code", label: "Python Code", level: 2 },
  { id: "data-export", label: "Data & Tables", level: 2 },
  { id: "charts-export", label: "Results Screenshot", level: 2 },
];

export default function ExportSharingOverviewPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Overview</h1>
            <p className="text-lg text-muted-foreground">
            Exporting and sharing your analysis results
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Download your results as Word reports, Python code, data tables, or screenshots—ready for presentations, publications, or further analysis."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Export. Share. Reproduce.
            </p>
            </blockquote>
        </div>

        {/* WHAT IS */}
        <section id="what-is" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What is Export & Sharing?
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                After completing an analysis, you can <strong className="text-foreground">export your results in multiple formats</strong> depending on your needs. Whether you're preparing a report, submitting homework, writing a paper, or sharing findings with colleagues, we provide the right format for each use case.
            </p>
            <p>
                All exports maintain the quality and formatting of your results, so you can use them directly without manual reformatting. Charts remain high-resolution, tables preserve their structure, and code is ready to run.
            </p>
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Word Report (.docx)</h3>
                </div>
                <p className="text-sm text-muted-foreground">Complete analysis report with all sections</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Code className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Python Code (.py)</h3>
                </div>
                <p className="text-sm text-muted-foreground">Reproducible code for your analysis</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">CSV Tables</h3>
                </div>
                <p className="text-sm text-muted-foreground">Statistical tables as spreadsheet files</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Image className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Results Screenshot (PNG)</h3>
                </div>
                <p className="text-sm text-muted-foreground">Full statistics screen with tables and charts</p>
              </div>
            </div>
        </section>

        {/* WORD EXPORT */}
        <section id="word-export" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <FileText className="w-7 h-7 text-primary" />
            Word Report (.docx)
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                The Word export generates a <strong className="text-foreground">complete, formatted analysis report</strong> that includes all three result layers (Summary, Reasoning, Statistics) along with tables and charts embedded in the document.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">What's Included</h3>
                <div className="grid md:grid-cols-[1fr_400px] gap-8 items-start">
                  {/* Left: List */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Cover Page</p>
                        <p className="text-sm text-muted-foreground">Analysis title, date, and basic information</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Executive Summary</p>
                        <p className="text-sm text-muted-foreground">Plain-language findings from the Summary section</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Reasoning & Interpretation</p>
                        <p className="text-sm text-muted-foreground">Explanation of why the results support the conclusions</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Statistical Results</p>
                        <p className="text-sm text-muted-foreground">Complete tables with all coefficients, p-values, and test statistics</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Visualizations</p>
                        <p className="text-sm text-muted-foreground">High-resolution charts and plots embedded in the document</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Model Diagnostics</p>
                        <p className="text-sm text-muted-foreground">Assumption checks and validation results</p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Image placeholder */}
                  <div className="hidden md:block">
                    <div className="rounded-lg border bg-white dark:bg-muted overflow-hidden shadow-sm">
                      {/* Image will be added here - Word document screenshot */}
                      <div className="w-full h-[600px] flex items-center justify-center bg-white dark:bg-muted">
                        <div className="text-center p-6">
                          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm font-medium text-foreground">Word Report Document</p>
                          <p className="text-xs text-muted-foreground mt-1">Formatted report with Summary, Reasoning, Statistics</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Best Used For</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <Presentation className="w-4 h-4 text-primary" />
                      Business Reports
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Share findings with stakeholders who need context and conclusions
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Academic Submissions
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Submit as part of thesis, dissertation, or course assignments
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-primary" />
                      Team Collaboration
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Share with colleagues who can add comments and feedback
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <FileDown className="w-4 h-4 text-primary" />
                      Documentation
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Archive complete analysis for future reference
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Editing the Word Document</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      Once downloaded, you can edit the Word document in Microsoft Word or Google Docs. Add your own commentary, adjust formatting, or reorganize sections as needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* PYTHON CODE */}
        <section id="python-code" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Code className="w-7 h-7 text-primary" />
            Python Code (.py)
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Export the exact Python code used to run your analysis. This is <strong className="text-foreground">ready-to-run code</strong> that reproduces your results, perfect for homework submissions, reproducible research, or learning how the analysis works under the hood.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">What's Included</h3>
                <div className="grid md:grid-cols-[1fr_400px] gap-8 items-start">
                  {/* Left: List */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Import Statements</p>
                        <p className="text-sm text-muted-foreground">All necessary libraries (pandas, scipy, statsmodels, scikit-learn, etc.)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Data Loading</p>
                        <p className="text-sm text-muted-foreground">Code to load your dataset (you'll need to provide the data file)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Analysis Execution</p>
                        <p className="text-sm text-muted-foreground">Complete code to run the analysis with your selected settings</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Output Generation</p>
                        <p className="text-sm text-muted-foreground">Code to display results, tables, and create visualizations</p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Image placeholder */}
                  <div className="hidden md:block">
                    <div className="rounded-lg border bg-slate-900 dark:bg-slate-950 overflow-hidden shadow-sm">
                      {/* Code editor preview */}
                      <div className="w-full h-[600px] flex items-center justify-center">
                        <div className="text-center p-6">
                          <Code className="w-16 h-16 text-slate-400 mx-auto mb-3" />
                          <p className="text-sm font-medium text-slate-300">Python Code</p>
                          <p className="text-xs text-slate-400 mt-1">Reproducible analysis code</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">What's NOT Included</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  The exported code is focused on <strong className="text-foreground">execution, not explanation</strong>. It doesn't include:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-muted-foreground">•</span>
                    <span>Step-by-step explanations of what each line does</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-muted-foreground">•</span>
                    <span>Statistical theory or methodology background</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-muted-foreground">•</span>
                    <span>Your actual data (you need to provide the data file separately)</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-muted-foreground">•</span>
                    <span>Complex error handling or edge case logic</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Best Used For</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-primary" />
                      Homework & Assignments
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Submit reproducible code along with your analysis report
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <Code className="w-4 h-4 text-primary" />
                      Learning Python
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      See how statistical analyses are implemented in code
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-primary" />
                      Reproducible Research
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Ensure others can replicate your exact analysis
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <FileDown className="w-4 h-4 text-primary" />
                      Further Customization
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Use as starting point to modify or extend the analysis
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Running the Code</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      To run the exported code, you'll need Python installed with the required libraries. Make sure to have your data file in the same directory or update the file path in the code. The code includes comments showing where to place your data file.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* DATA & TABLES EXPORT */}
        <section id="data-export" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <FileSpreadsheet className="w-7 h-7 text-primary" />
            Data & Tables (CSV)
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Export statistical tables and data as CSV files for use in Excel, Google Sheets, or further analysis in other tools.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">What You Can Export</h3>
                <div className="grid md:grid-cols-[1fr_400px] gap-8 items-start">
                  {/* Left: List */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Statistical Tables</p>
                        <p className="text-sm text-muted-foreground">Coefficient tables, ANOVA tables, correlation matrices, etc.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Original Data</p>
                        <p className="text-sm text-muted-foreground">The dataset used in your analysis</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Predicted Values</p>
                        <p className="text-sm text-muted-foreground">Model predictions and residuals (for regression/ML analyses)</p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Image placeholder */}
                  <div className="hidden md:block">
                    <div className="rounded-lg border bg-white dark:bg-muted overflow-hidden shadow-sm">
                      {/* Spreadsheet preview */}
                      <div className="w-full h-[600px] flex items-center justify-center bg-white dark:bg-muted">
                        <div className="text-center p-6">
                          <FileSpreadsheet className="w-16 h-16 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm font-medium text-foreground">Statistical Table</p>
                          <p className="text-xs text-muted-foreground mt-1">Excel/CSV spreadsheet format</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Best Used For</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Further Analysis</h4>
                    <p className="text-xs text-muted-foreground">
                      Import tables into Excel or other tools for custom calculations
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Data Sharing</h4>
                    <p className="text-xs text-muted-foreground">
                      Share clean, structured data with colleagues
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Creating Custom Reports</h4>
                    <p className="text-xs text-muted-foreground">
                      Use the tables to build your own formatted reports
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Archiving Results</h4>
                    <p className="text-xs text-muted-foreground">
                      Keep raw data for long-term storage
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* CHARTS EXPORT */}
        <section id="charts-export" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-primary" />
            Results Screenshot (PNG)
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Download the entire Statistics results screen as a high-resolution PNG image, including all tables, charts, and text in a single screenshot.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">What's Included in the Screenshot</h3>
                <div className="grid md:grid-cols-[1fr_400px] gap-8 items-start">
                  {/* Left: List */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Complete Statistics Section</p>
                        <p className="text-sm text-muted-foreground">The entire results screen including all content from top to bottom</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Statistical Tables</p>
                        <p className="text-sm text-muted-foreground">All coefficient tables, ANOVA tables, test statistics</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Charts and Visualizations</p>
                        <p className="text-sm text-muted-foreground">Scatterplots, residual plots, distribution charts in one image</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">APA-Formatted Text</p>
                        <p className="text-sm text-muted-foreground">Statistical reporting text included in the screenshot</p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Image placeholder */}
                  <div className="hidden md:block">
                    <div className="rounded-lg border bg-white dark:bg-muted overflow-hidden shadow-sm">
                      {/* Full statistics screen screenshot */}
                      <div className="w-full h-[600px] flex items-center justify-center bg-white dark:bg-muted">
                        <div className="text-center p-6">
                          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm font-medium text-foreground">Statistics Screen</p>
                          <p className="text-xs text-muted-foreground mt-1">Complete results with tables + charts</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Best Used For</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Quick Sharing</h4>
                    <p className="text-xs text-muted-foreground">
                      Share complete results via email, Slack, or messaging apps
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Presentations</h4>
                    <p className="text-xs text-muted-foreground">
                      Insert full analysis results into PowerPoint slides
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Documentation</h4>
                    <p className="text-xs text-muted-foreground">
                      Capture and archive complete analysis output
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Reports</h4>
                    <p className="text-xs text-muted-foreground">
                      Include in documents when you need visual proof of results
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-primary/5 border-l-4 border-primary rounded">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Tip:</strong> The screenshot captures the entire Statistics section as one continuous image, including all tables, charts, and text. This is perfect when you want to share everything at once without needing separate files.
                </p>
              </div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}

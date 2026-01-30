'use client';

import React from 'react';
import {
  Upload,
  FileSpreadsheet,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  BookOpen,
  Info,
  AlertCircle,
  Table,
  Sparkles,
  FileText,
  Database,
  Target,
  Lightbulb,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-is", label: "What is Data Preparation?", level: 2 },
  { id: "uploading-data", label: "Uploading Data", level: 2 },
  { id: "example-datasets", label: "Example Datasets", level: 2 },
  { id: "data-preview", label: "Data Preview", level: 2 },
  { id: "requirements", label: "Data Requirements", level: 2 },
];

export default function StrategicDataPreparationPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Data Preparation</h1>
            <p className="text-lg text-muted-foreground">
            Preparing your data for strategic business analysis
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Upload your business data or explore with example datasets to begin solving strategic problems and optimizing business outcomes."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Upload. Preview. Optimize.
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
                Data Preparation is the first step in any strategic analysis. It involves <strong className="text-foreground">getting your business data into the platform</strong> so you can run domain-specific analyses that drive actionable decisions.
            </p>
            <p>
                You have two options: upload your own business data (customer records, sales transactions, inventory logs, etc.) or start with curated example datasets that demonstrate each analysis type. Once your data is loaded, you can preview it, verify quality, and proceed to configure your analysis.
            </p>
            <p>
                Unlike standard statistical analysis where you might have generic datasets, strategic decision analyses expect business-specific data formats—customer IDs, transaction dates, revenue amounts, product categories, and other domain-relevant fields.
            </p>
            </div>
        </section>

        {/* UPLOADING DATA */}
        <section id="uploading-data" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Upload className="w-7 h-7 text-primary" />
            Uploading Your Data
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Supported File Formats</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-base">CSV</h4>
                      <p className="text-sm text-muted-foreground">Comma-separated values (.csv)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-base">Excel</h4>
                      <p className="text-sm text-muted-foreground">Excel workbook (.xlsx, .xls)</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">How to Upload</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Click "Upload Your Data" button</p>
                      <p className="text-sm text-muted-foreground">Located on the analysis intro page</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Select your file from your computer</p>
                      <p className="text-sm text-muted-foreground">Choose a CSV or Excel file with your business data</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Wait for the upload to complete</p>
                      <p className="text-sm text-muted-foreground">You'll see a preview of your data once it's loaded and proceed to configuration</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">File Upload Tips for Strategic Analyses</p>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                      <li>• Include all relevant business fields (customer ID, dates, amounts, categories)</li>
                      <li>• Use column headers that clearly describe the data (e.g., "customer_id", "purchase_date", "revenue")</li>
                      <li>• Ensure dates are in consistent format (YYYY-MM-DD preferred)</li>
                      <li>• Keep numeric fields clean (no currency symbols or commas in numbers)</li>
                      <li>• File sizes under 50MB work best for optimal performance</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* EXAMPLE DATASETS */}
        <section id="example-datasets" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-primary" />
            Using Example Datasets
            </h2>

            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Don't have your own data yet? No problem! Each strategic analysis comes with a <strong className="text-foreground">tailored example dataset</strong> that demonstrates exactly how that analysis works with realistic business data.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">Why Use Example Datasets?</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Learn how each analysis works</p>
                      <p className="text-sm text-muted-foreground">See real business scenarios like customer churn, marketing optimization, or inventory planning</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Understand data requirements</p>
                      <p className="text-sm text-muted-foreground">See exactly what columns and formats each analysis expects</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Explore safely before using your data</p>
                      <p className="text-sm text-muted-foreground">Test different settings and configurations without risking your actual business data</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Get inspired for your own analysis</p>
                      <p className="text-sm text-muted-foreground">See how insights are generated and adapt the approach to your business</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Example Dataset Types</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Customer Behavior</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      User activity logs, cohort analysis data, churn prediction datasets
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Columns:</strong> user_id, event_date, event_type, revenue
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Sales & Revenue</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Transaction data, sales forecasting, pricing optimization
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Columns:</strong> date, product, quantity, price, customer_segment
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Marketing Campaigns</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Channel performance, marketing mix modeling, ROI analysis
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Columns:</strong> channel, spend, impressions, clicks, conversions
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">Operations & Logistics</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Routing data, inventory levels, production schedules
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Columns:</strong> location, demand, capacity, distance, cost
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">How to Load Example Data</h3>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    On each analysis intro page, look for the <strong className="text-foreground">"Load Sample Data"</strong> button. Click it to instantly load a dataset specifically designed for that analysis. The example data is pre-configured with realistic values and the right column structure.
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded">
                    <Lightbulb className="w-4 h-4 text-primary flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      After loading sample data, the analysis will automatically move to the configuration step with appropriate default settings already selected.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* DATA PREVIEW */}
        <section id="data-preview" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Eye className="w-7 h-7 text-primary" />
            Data Preview & Management
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Once your data is loaded, you'll see a collapsible preview panel that shows the first few rows and all column names. This helps you verify that your data uploaded correctly and identify which columns to use in your analysis.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">What You'll See</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">File name and dimensions</h4>
                      <p className="text-sm text-muted-foreground">The name of your uploaded file and total rows × columns (e.g., "500 rows × 4 columns")</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Table className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Sample rows</h4>
                      <p className="text-sm text-muted-foreground">First 10 rows of your data displayed in a table to verify it looks correct</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Eye className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Column names</h4>
                      <p className="text-sm text-muted-foreground">All column headers visible so you can identify the right fields for your analysis</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Available Actions</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg border">
                    <Download className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Download Data</p>
                      <p className="text-sm text-muted-foreground">Export your current dataset as CSV for backup or external use</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border">
                    <Trash2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Clear Data</p>
                      <p className="text-sm text-muted-foreground">Remove current data and start fresh with a different dataset</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Expandable Preview</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      The data preview is collapsible to save screen space. Click the header to expand/collapse it. The preview stays visible throughout your analysis so you can always reference your data columns.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* DATA REQUIREMENTS */}
        <section id="requirements" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Info className="w-7 h-7 text-primary" />
            Data Requirements
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Strategic analyses have specific data requirements depending on the business domain and analysis type. While requirements vary by analysis, here are general guidelines.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">General Requirements</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Column headers required</p>
                      <p className="text-sm text-muted-foreground">First row should contain clear, descriptive column names</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Minimum sample size</p>
                      <p className="text-sm text-muted-foreground">Most analyses require at least 50-100 records for reliable results (varies by analysis)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Required business fields</p>
                      <p className="text-sm text-muted-foreground">Each analysis specifies which columns it needs (e.g., customer ID, date, revenue)</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Domain-Specific Requirements</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Customer & Engagement Analyses
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Cohort analysis, churn prediction, customer segmentation
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• User/Customer ID column (unique identifiers)</li>
                      <li>• Date/timestamp columns (event dates, signup dates)</li>
                      <li>• Optional: Revenue, event type, product category</li>
                      <li>• Minimum: 50 unique users with activity over multiple time periods</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary" />
                      Marketing & Sales Analyses
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Marketing mix modeling, pricing optimization, sales forecasting
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• Date column (time series data)</li>
                      <li>• Spend/budget columns (by channel or category)</li>
                      <li>• Outcome metrics (revenue, conversions, sales)</li>
                      <li>• Minimum: 12-24 time periods for meaningful trends</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Operations & Logistics Analyses
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Vehicle routing, inventory optimization, scheduling
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• Location/node identifiers (addresses, warehouse IDs)</li>
                      <li>• Demand/quantity columns (orders, units needed)</li>
                      <li>• Constraints (capacity, time windows, costs)</li>
                      <li>• Optional: Distance matrix, priority levels</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Best Practices</h3>
                <div className="p-5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Use snake_case or camelCase for column names (e.g., customer_id or customerId)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Keep data formats consistent within each column (all dates in same format, all numbers clean)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Remove completely empty rows or columns before uploading</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>For date columns, use ISO format (YYYY-MM-DD) or consistent MM/DD/YYYY</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>For numeric columns, remove currency symbols ($, €) and thousand separators (,)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Save Excel files as .xlsx format for best compatibility</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-5 bg-primary/5 border-l-4 border-primary rounded">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Note:</strong> Each strategic analysis has its own specific requirements. These are checked during the Validation step before running the analysis. If your data doesn't meet the requirements, you'll see clear error messages explaining what needs to be fixed.
                </p>
              </div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}
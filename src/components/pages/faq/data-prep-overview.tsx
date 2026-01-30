'use client';

import React from 'react';
import {
  BookOpen,
  Zap,
  CheckCircle2,
  Wrench,
  Upload,
  Database,
  Edit3,
  Eraser,
  Wand2,
  GitMerge,
  Download,
  Info,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-is", label: "What is Data Preparation?", level: 2 },
  { id: "key-features", label: "Key Features", level: 2 },
  { id: "when-to-use", label: "When to Use", level: 2 },
];

export default function DataPrepOverview() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Overview: Data Preparation</h1>
            <p className="text-lg text-muted-foreground">
            An introduction to the Data Preparation tool for cleaning and transforming your data.
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Transform messy, incomplete data into analysis-ready datasets with an intuitive, powerful spreadsheet-like interface. No code required."
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
                Data Preparation is a <strong className="text-foreground">visual data editing and cleaning tool</strong> designed to prepare your datasets for analysis. It provides an Excel-like interface with powerful data science capabilities, allowing you to handle everything from missing values to advanced transformations without writing a single line of code.
            </p>
            <p>
                The tool manages multiple datasets in tabs, tracks every change with a 50-step undo/redo history, and provides real-time statistical summaries of your columns. This streamlined workflow ensures your data is clean, consistent, and correctly formatted for any statistical or machine learning task.
            </p>
            </div>
        </section>

        {/* KEY FEATURES */}
        <section id="key-features" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Zap className="w-7 h-7 text-primary" />
            Key Features
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
                {[
                    { icon: Upload, title: "Multi-Format Import", description: "Load CSV, Excel, and JSON files with drag-and-drop. Work on multiple files in separate tabs." },
                    { icon: Edit3, title: "Spreadsheet Interface", description: "An intuitive grid for editing cells, sorting columns, and managing rows and columns." },
                    { icon: Eraser, title: "Data Cleaning", description: "Handle missing values with mean, median, mode, or forward/backward fill. Find and remove duplicates." },
                    { icon: Wand2, title: "Data Transformation", description: "Apply functions like log, z-score, and min-max scaling. Convert categorical data using one-hot encoding." },
                    { icon: GitMerge, title: "Advanced Merging", description: "Combine datasets with append (stacking) or SQL-style joins (inner, left, right, full)." },
                    { icon: Download, title: "Flexible Export", description: "Download your cleaned data as CSV, Excel, or JSON, ready for your next analysis." }
                ].map(item => (
                    <div key={item.title} className="p-5 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-primary/10 rounded-lg"><item.icon className="w-5 h-5 text-primary" /></div>
                            <h3 className="font-semibold text-base">{item.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                ))}
            </div>
        </section>

        {/* WHEN TO USE */}
        <section id="when-to-use" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-7 h-7 text-primary" />
            When to Use
            </h2>
            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Use the Data Preparation tool whenever your raw data isn't quite ready for analysis.
            </p>
            <div className="space-y-3">
                <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" /><div><p className="font-medium">You have missing data or duplicates</p><p className="text-sm text-muted-foreground">Quickly impute missing values or remove duplicate entries.</p></div></div>
                <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" /><div><p className="font-medium">You need to combine datasets</p><p className="text-sm text-muted-foreground">Join customer data with sales data, or append monthly reports.</p></div></div>
                <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" /><div><p className="font-medium">You need to prepare data for machine learning</p><p className="text-sm text-muted-foreground">Normalize features or one-hot encode categorical variables.</p></div></div>
                <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" /><div><p className="font-medium">You want to visually explore and clean data</p><p className="text-sm text-muted-foreground">A hands-on, no-code alternative to writing data cleaning scripts.</p></div></div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}

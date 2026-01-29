'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  FileSpreadsheet,
  Eye,
  CheckCircle2,
  BookOpen,
  Info,
  AlertCircle,
  FileJson,
  Table,
  Sparkles
} from 'lucide-react';

const SUPPORTED_FORMATS = [
  { icon: FileSpreadsheet, label: 'CSV', description: 'Comma-separated values (.csv)' },
  { icon: FileSpreadsheet, label: 'Excel', description: 'Excel workbook (.xlsx, .xls)' },
  { icon: FileJson, label: 'JSON', description: 'JavaScript Object Notation (.json)' }
];

export default function DataPreparationOverviewSection() {
  return (
    <Card>
      <CardContent className="p-8">
        <article className="prose prose-slate max-w-none">
          
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Data Preparation</h1>
            <p className="text-lg text-muted-foreground">
              Preparing your data for statistical analysis
            </p>
          </div>

          <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
              <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Upload your own data or start with example datasets to begin your statistical analysis journey."
              </p>
              <p className="text-base text-muted-foreground font-medium not-italic">
                Upload. Preview. Analyze.
              </p>
            </blockquote>
          </div>

          <section id="what-is" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-primary" />
              What is Data Preparation?
            </h2>
            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
              <p>
                Data Preparation is the first step in any statistical analysis. It involves <strong className="text-foreground">getting your data into the platform</strong> so you can run analyses on it.
              </p>
            </div>
          </section>

          <section id="uploading-data" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Upload className="w-7 h-7 text-primary" />
              Uploading Your Data
            </h2>
            <p>Content for this section goes here.</p>
          </section>

          <section id="example-datasets" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-primary" />
              Using Example Datasets
            </h2>
            <p>Content for this section goes here.</p>
          </section>

          <section id="data-preview" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Eye className="w-7 h-7 text-primary" />
              Data Preview & Management
            </h2>
            <p>Content for this section goes here.</p>
          </section>

          <section id="requirements" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Info className="w-7 h-7 text-primary" />
              Data Requirements
            </h2>
            <p>Content for this section goes here.</p>
          </section>
        </article>
      </CardContent>
    </Card>
  );
}

'use client';

import React from 'react';
import {
  Upload,
  FileSpreadsheet,
  Eye,
  BookOpen,
  Info,
  FileJson,
  Sparkles
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
    { id: 'what-is', label: 'What is Data Preparation?', level: 2 },
    { id: 'uploading-data', label: 'Uploading Your Data', level: 2 },
    { id: 'example-datasets', label: 'Using Example Datasets', level: 2 },
    { id: 'data-preview', label: 'Data Preview & Management', level: 2 },
    { id: 'requirements', label: 'Data Requirements', level: 2 },
];

export default function DataPreparationOverviewSection() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
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
                <h2 id="what-is" className="text-3xl font-bold mb-6 flex items-center gap-3">
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
                <h2 id="uploading-data" className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Upload className="w-7 h-7 text-primary" />
                Uploading Your Data
                </h2>
                <p>Content for this section goes here.</p>
            </section>

            <section id="example-datasets" className="scroll-mt-24 mb-16 border-t pt-12">
                <h2 id="example-datasets" className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-primary" />
                Using Example Datasets
                </h2>
                <p>Content for this section goes here.</p>
            </section>

            <section id="data-preview" className="scroll-mt-24 mb-16 border-t pt-12">
                <h2 id="data-preview" className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Eye className="w-7 h-7 text-primary" />
                Data Preview & Management
                </h2>
                <p>Content for this section goes here.</p>
            </section>

            <section id="requirements" className="scroll-mt-24 mb-16 border-t pt-12">
                <h2 id="requirements" className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Info className="w-7 h-7 text-primary" />
                Data Requirements
                </h2>
                <p>Content for this section goes here.</p>
            </section>
        </article>
    </FaqArticleLayout>
  );
}

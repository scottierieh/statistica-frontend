'use client';

import React from 'react';
import {
  Download,
  FileText,
  Code,
  FileSpreadsheet,
  Image,
  BookOpen,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
    { id: 'what-is', label: 'What is Export & Sharing?', level: 2 },
    { id: 'word-export', label: 'Word Report (.docx)', level: 2 },
    { id: 'python-code', label: 'Python Code (.py)', level: 2 },
    { id: 'data-export', label: 'Data & Tables (CSV)', level: 2 },
    { id: 'charts-export', label: 'Results Screenshot (PNG)', level: 2 },
];

export default function ExportingSharingPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
            <h1 className="text-4xl font-bold mb-4">Exporting & Sharing</h1>
            <p className="text-lg text-muted-foreground mb-8">How to export and share your findings.</p>

            <section id="what-is" className="scroll-mt-24 mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <BookOpen className="w-7 h-7 text-primary" />
                What is Export & Sharing?
                </h2>
                <p>Content for this section goes here.</p>
            </section>

            <section id="word-export" className="scroll-mt-24 mb-16 border-t pt-12">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <FileText className="w-7 h-7 text-primary" />
                Word Report (.docx)
                </h2>
                <p>Content for this section goes here.</p>
            </section>

            <section id="python-code" className="scroll-mt-24 mb-16 border-t pt-12">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Code className="w-7 h-7 text-primary" />
                Python Code (.py)
                </h2>
                <p>Content for this section goes here.</p>
            </section>
            
            <section id="data-export" className="scroll-mt-24 mb-16 border-t pt-12">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <FileSpreadsheet className="w-7 h-7 text-primary" />
                Data & Tables (CSV)
                </h2>
                <p>Content for this section goes here.</p>
            </section>

            <section id="charts-export" className="scroll-mt-24 mb-16 border-t pt-12">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Image className="w-7 h-7 text-primary" />
                Results Screenshot (PNG)
                </h2>
                <p>Content for this section goes here.</p>
            </section>
        </article>
    </FaqArticleLayout>
  );
}

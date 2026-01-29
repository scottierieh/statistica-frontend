'use client';

import React from 'react';
import {
  BookOpen,
  HelpCircle,
  FileText,
  Search,
} from 'lucide-react';

export default function TroubleshootingFaqPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-4xl font-bold mb-4">Guides & Terminology</h1>
      <p className="text-lg text-muted-foreground mb-8">Understanding analysis methods and statistical concepts</p>

      <section id="what-is" className="scroll-mt-24 mb-16">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-primary" />
          What are Guides & Terminology?
        </h2>
        <p>Content for this section goes here.</p>
      </section>

      <section id="analysis-guides" className="scroll-mt-24 mb-16 border-t pt-12">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <FileText className="w-7 h-7 text-primary" />
          Analysis Guides
        </h2>
        <p>Content for this section goes here.</p>
      </section>

      <section id="statistical-glossary" className="scroll-mt-24 mb-16 border-t pt-12">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <HelpCircle className="w-7 h-7 text-primary" />
          Statistical Glossary
        </h2>
        <p>Content for this section goes here.</p>
      </section>

      <section id="how-to-access" className="scroll-mt-24 mb-16 border-t pt-12">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <Search className="w-7 h-7 text-primary" />
          How to Access Guides & Terminology
        </h2>
        <p>Content for this section goes here.</p>
      </section>

    </article>
  );
}

'use client';

import React from 'react';
import {
  FileSearch,
  Lightbulb,
  Sigma,
  BookOpen,
  Target
} from 'lucide-react';
import FaqArticleLayout from '@/components/faq/FaqArticleLayout';

export default function UnderstandingResultsPage() {
  return (
    <FaqArticleLayout>
        <article className="prose prose-slate max-w-none">
            <h1 className="text-4xl font-bold mb-4">Understanding Results</h1>
            <p className="text-lg text-muted-foreground mb-8">How to interpret your analysis results.</p>

            <section id="what-is" className="scroll-mt-24 mb-16">
                <h2 id="what-is" className="text-3xl font-bold mb-6 flex items-center gap-3">
                <BookOpen className="w-7 h-7 text-primary" />
                What are Results?
                </h2>
                <p>Content for this section goes here.</p>
            </section>

            <section id="step-summary" className="scroll-mt-24 mb-16 border-t pt-12">
                <h2 id="step-summary" className="text-3xl font-bold mb-6 flex items-center gap-3">
                <FileSearch className="w-7 h-7 text-primary" />
                Step 4: Summary
                </h2>
                <p>Content for this section goes here.</p>
            </section>

            <section id="step-reasoning" className="scroll-mt-24 mb-16 border-t pt-12">
                <h2 id="step-reasoning" className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Lightbulb className="w-7 h-7 text-primary" />
                Step 5: Reasoning
                </h2>
                <p>Content for this section goes here.</p>
            </section>

            <section id="step-statistics" className="scroll-mt-24 mb-16 border-t pt-12">
                <h2 id="step-statistics" className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Sigma className="w-7 h-7 text-primary" />
                Step 6: Statistics
                </h2>
                <p>Content for this section goes here.</p>
            </section>
            
            <section id="how-to-use" className="scroll-mt-24 mb-16 border-t pt-12">
                <h2 id="how-to-use" className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Target className="w-7 h-7 text-primary" />
                How to Use Results
                </h2>
                <p>Content for this section goes here.</p>
            </section>
        </article>
    </FaqArticleLayout>
  );
}

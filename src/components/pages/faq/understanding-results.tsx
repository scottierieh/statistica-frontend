'use client';

import React from 'react';
import {
  FileSearch,
  Lightbulb,
  Sigma,
  BookOpen,
  Target
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
    { id: 'what-is', label: 'What are Results?', level: 2 },
    { id: 'step-summary', label: 'Step 4: Summary', level: 2 },
    { id: 'step-reasoning', label: 'Step 5: Reasoning', level: 2 },
    { id: 'step-statistics', label: 'Step 6: Statistics', level: 2 },
    { id: 'how-to-use', label: 'How to Use Results', level: 2 },
];

export default function UnderstandingResultsPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
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

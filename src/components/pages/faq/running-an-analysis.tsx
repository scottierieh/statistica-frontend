'use client';

import React from 'react';
import {
  Variable,
  Settings2,
  ShieldCheck,
  Info,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
    { id: 'what-is', label: 'What is Running Analysis?', level: 2 },
    { id: 'step-variables', label: 'Step 1: Variables', level: 2 },
    { id: 'step-settings', label: 'Step 2: Settings', level: 2 },
    { id: 'step-validation', label: 'Step 3: Validation', level: 2 },
];

export default function RunningAnalysisPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
            <h1 className="text-4xl font-bold mb-4">Running an Analysis</h1>
            <p className="text-lg text-muted-foreground mb-8">A step-by-step guide to executing analyses.</p>

            <section id="what-is" className="scroll-mt-24 mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Info className="w-7 h-7 text-primary" />
                What is Running Analysis?
                </h2>
                <p>Content for this section goes here.</p>
            </section>

            <section id="step-variables" className="scroll-mt-24 mb-16 border-t pt-12">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Variable className="w-7 h-7 text-primary" />
                Step 1: Variables
                </h2>
                <p>Content for this section goes here.</p>
            </section>

            <section id="step-settings" className="scroll-mt-24 mb-16 border-t pt-12">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Settings2 className="w-7 h-7 text-primary" />
                Step 2: Settings
                </h2>
                <p>Content for this section goes here.</p>
            </section>

            <section id="step-validation" className="scroll-mt-24 mb-16 border-t pt-12">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <ShieldCheck className="w-7 h-7 text-primary" />
                Step 3: Validation
                </h2>
                <p>Content for this section goes here.</p>
            </section>
        </article>
    </FaqArticleLayout>
  );
}

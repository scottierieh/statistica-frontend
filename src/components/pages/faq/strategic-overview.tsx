'use client';

import React from 'react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';
import { BookOpen } from 'lucide-react';

const SECTIONS: Section[] = [
  { id: "introduction", label: "Introduction", level: 2 },
];

export default function StrategicOverviewPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
      <article className="prose prose-slate max-w-none">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            Strategic Decision Guide: Overview
          </h1>
          <p className="text-lg text-muted-foreground">
            What is Strategic Decision-Making and how does it work?
          </p>
        </div>
        <section id="introduction" className="scroll-mt-24 my-16">
          <h2 className="text-3xl font-bold mb-4">Under Construction</h2>
          <p>This page is currently under construction. Content will be added soon.</p>
        </section>
      </article>
    </FaqArticleLayout>
  );
}

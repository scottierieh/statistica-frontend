'use client';

import React from 'react';
import {
  Calculator,
  ShieldCheck,
  FileText,
  Variable,
  Settings2,
  FileSearch,
  Lightbulb,
  Sigma,
  CheckCircle2,
  BookOpen,
  Info,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
    { id: 'what-is', label: 'What is Standard Analysis?', level: 2 },
    { id: 'comparison', label: 'What You Can Do', level: 2 },
    { id: 'when-to-use', label: 'When to Use', level: 2 },
    { id: 'key-features', label: 'Key Features', level: 2 },
    { id: 'how-it-works', label: 'How It Works: 6-Step Process', level: 2 },
];


export default function OverviewPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Overview</h1>
            <p className="text-lg text-muted-foreground">
            Understanding Standard Analysis and when to use it
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Standard Analysis is a method-driven statistical workspace that gives
                you full control over how an analysis is run and how results are
                explained."
            </p>
            </blockquote>
        </div>

        {/* WHAT IS */}
        <section id="what-is" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What is Standard Analysis?
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                Standard Analysis is for researchers and analysts who want to{' '}
                <strong className="text-foreground">
                choose their own statistical method
                </strong>{' '}
                rather than relying on automated recommendations.
            </p>
            <p>
                Instead of answering a research question and letting AI select a
                method, you directly select from over 100 statistical tests and
                models. This gives you full transparency and control over every
                parameter, assumption check, and output format.
            </p>
            <p>
                Whether you're familiar with statistical methods or learning them for
                the first time, Standard Analysis guides you through a structured
                process while giving you access to complete statistical rigor.
            </p>
            </div>
        </section>

        {/* WHAT YOU CAN DO */}
        <section id="comparison" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-primary" />
            What You Can Do
            </h2>
            <p>What you can do with Standard Analysis will be updated soon.</p>
        </section>

        {/* WHEN TO USE */}
        <section id="when-to-use" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-primary" />
            When to Use
            </h2>

            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            Use Standard Analysis when you want{' '}
            <strong className="text-foreground">control</strong>,{' '}
            <strong className="text-foreground">transparency</strong>, and{' '}
            <strong className="text-foreground">
                statistically rigorous results
            </strong>
            .
            </p>

            <div className="space-y-4">
            {[
                {
                title: 'You know which statistical method you need',
                desc: "You're familiar with t-tests, ANOVA, regression, or want to learn a specific method",
                },
                {
                title: 'You want full control over parameters',
                desc: 'You need to customize alpha levels, post-hoc tests, confidence intervals, and other settings',
                },
                {
                title: 'You need complete statistical output',
                desc: 'For academic papers, research reports, or professional presentations',
                },
                {
                title: 'You want to validate assumptions',
                desc: 'Built-in checks ensure your data meets statistical requirements before running tests',
                },
            ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-1" />
                <div>
                    <p className="font-semibold text-base mb-1">{item.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                    </p>
                </div>
                </div>
            ))}
            </div>
        </section>

        {/* KEY FEATURES */}
        <section id="key-features" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Info className="w-7 h-7 text-primary" />
            Key Features
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
            {KEY_FEATURES.map((feature, index) => (
                <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30"
                >
                <div className="p-2 bg-primary/10 rounded-lg">
                    <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-base mb-1">
                    {feature.label}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                    </p>
                </div>
                </div>
            ))}
            </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
            <Settings2 className="w-7 h-7 text-primary" />
            How It Works: 6-Step Process
            </h2>

            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
            Every analysis follows a consistent step-based structure, from variable
            selection to result interpretation.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {ANALYSIS_STEPS.map((step) => (
                <div
                key={step.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-background"
                >
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {step.id}
                </div>
                <div className="flex items-center gap-2">
                    <step.icon className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{step.label}</span>
                </div>
                </div>
            ))}
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}

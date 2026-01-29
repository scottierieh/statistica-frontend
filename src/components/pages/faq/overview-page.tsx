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
  TrendingUp
} from 'lucide-react';

const KEY_FEATURES = [
  {
    icon: Calculator,
    label: 'Method-Driven',
    description: 'You choose the statistical method that fits your research question, not an algorithm'
  },
  {
    icon: ShieldCheck,
    label: 'Assumption-Aware',
    description: 'Built-in validation checks ensure your data meets the requirements before running tests'
  },
  {
    icon: Lightbulb,
    label: 'Explainable Results',
    description: 'Every result comes with plain-language explanations of what it means and why it matters'
  },
  {
    icon: FileText,
    label: 'Publication-Ready Output',
    description: 'Get complete statistical tables, charts, and metrics formatted for academic or professional use'
  }
];

const ANALYSIS_STEPS = [
  { id: 1, icon: Variable, label: 'Variables' },
  { id: 2, icon: Settings2, label: 'Settings' },
  { id: 3, icon: ShieldCheck, label: 'Validation' },
  { id: 4, icon: FileSearch, label: 'Summary' },
  { id: 5, icon: Lightbulb, label: 'Reasoning' },
  { id: 6, icon: Sigma, label: 'Statistics' }
];

export default function OverviewPage() {
  return (
    <article className="prose prose-slate max-w-none">
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Overview</h1>
        <p className="text-lg text-muted-foreground">
          Understanding Standard Analysis and when to use it
        </p>
      </div>

      <div className="mb-12 pb-8 border-b">
        <blockquote className="border-l-4 border-primary pl-6 py-2">
          <p className="text-xl italic leading-relaxed text-foreground mb-3">
            "Standard Analysis is a method-driven statistical workspace that gives you full control over how an analysis is run and how results are explained."
          </p>
        </blockquote>
      </div>

      <section id="what-is" className="scroll-mt-24 mb-16">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-primary" />
          What is Standard Analysis?
        </h2>
        <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
          <p>
            Standard Analysis is for researchers and analysts who want to <strong className="text-foreground">choose their own statistical method</strong> rather than relying on automated recommendations.
          </p>
          <p>
            Instead of answering a research question and letting AI select a method, you directly select from over 100 statistical tests and models. This gives you full transparency and control over every parameter, assumption check, and output format.
          </p>
          <p>
            Whether you're familiar with statistical methods or learning them for the first time, Standard Analysis guides you through a structured process while giving you access to complete statistical rigor.
          </p>
        </div>
      </section>

      <section id="comparison" className="scroll-mt-24 mb-16 border-t pt-12">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-primary" />
          What You Can Do
        </h2>
        <p>What you can do with Standard Analysis will be updated soon.</p>
      </section>

      <section id="when-to-use" className="scroll-mt-24 mb-16 border-t pt-12">
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <HelpCircle className="w-7 h-7 text-primary" />
          When to Use
        </h2>
        <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
          Use Standard Analysis when you want <strong className="text-foreground">control</strong>, 
          <strong className="text-foreground"> transparency</strong>, and 
          <strong className="text-foreground"> statistically rigorous results</strong>.
        </p>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold text-base mb-1">You know which statistical method you need</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You're familiar with t-tests, ANOVA, regression, or want to learn a specific method
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold text-base mb-1">You want full control over parameters</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You need to customize alpha levels, post-hoc tests, confidence intervals, and other settings
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold text-base mb-1">You need complete statistical output</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For academic papers, research reports, or professional presentations
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold text-base mb-1">You want to validate assumptions</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Built-in checks ensure your data meets statistical requirements before running tests
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="key-features" className="scroll-mt-24 mb-16 border-t pt-12">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <Info className="w-7 h-7 text-primary" />
          Key Features
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {KEY_FEATURES.map((feature, index) => (
            <div key={index} className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1">{feature.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 mb-16 border-t pt-12">
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <Settings2 className="w-7 h-7 text-primary" />
          How It Works: 6-Step Process
        </h2>
        <p className="text-base text-muted-foreground mb-8 leading-relaxed">
          Every analysis follows a consistent step-based structure, from variable selection to result interpretation. 
          This ensures you understand both <strong className="text-foreground">what the results mean</strong> and 
          <strong className="text-foreground"> why they occurred</strong>.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {ANALYSIS_STEPS.map((step) => (
            <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                {step.id}
              </div>
              <div className="flex items-center gap-2">
                <step.icon className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">{step.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 bg-primary/5 border-l-4 border-primary rounded">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Want details?</strong> Each step is explained in depth in the 
            <a href="#" className="text-primary hover:underline ml-1">Standard Analysis</a> section.
          </p>
        </div>
      </section>
    </article>
  );
}

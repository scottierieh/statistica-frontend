'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Database,
  Calculator,
  Target,
  Network,
  Presentation,
  Repeat,
  ClipboardList,
  Waypoints,
  DollarSign,
  Monitor,
  FlaskConical,
  BrainCircuit,
  LucideIcon,
  HelpCircle,
  Settings,
  Users,
  Wrench,
  Rocket,
  Wand2,
  Bot,
  Sparkles,
  FileText,
  Code,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CORE_MODULES: {
  title: string;
  description: string;
  icon: LucideIcon;
  status: 'beta' | 'coming_soon' | 'live';
  slug?: string;
}[] = [
  {
    title: "Data Preparation",
    description: "Refine and validate your raw data to ensure a reliable foundation.",
    icon: Database,
    status: 'beta',
    slug: 'transformation-overview',
  },
  {
    title: "Standard Analytics",
    description: "Execute fundamental statistical tests to identify patterns.",
    icon: Calculator,
    status: 'beta',
    slug: 'overview',
  },
  {
    title: "Strategic Decision",
    description: "Solve complex business problems with domain-specific optimization.",
    icon: Target,
    status: 'beta',
    slug: 'strategic-overview',
  },
  {
    title: "Structural Equation Modeling (SEM)",
    description: "Build and estimate SEM models by uploading path diagram images.",
    icon: Network,
    status: 'beta',
    slug: 'sem-overview',
  },
  {
    title: "Visual Communication",
    description: "Transform complex analytical results into clear visual narratives.",
    icon: Presentation,
    status: 'coming_soon',
  },
  {
    title: "Integrated Assessment",
    description: "Synthesize multi-dimensional data to evaluate overall performance.",
    icon: Repeat,
    status: 'coming_soon',
  },
  {
    title: "Survey Tool",
    description: "Create surveys and transform responses into statistical and decision-ready analyses.",
    icon: ClipboardList,
    status: 'coming_soon',
  },
  {
    title: "Decision Analytics",
    description: "Optimize decisions with linear, goal, and transportation programming.",
    icon: Waypoints,
    status: 'coming_soon',
  },
  {
    title: "Derivatives Analysis",
    description: "Tools for options pricing, greeks, and derivatives modeling.",
    icon: DollarSign,
    status: 'coming_soon',
  },
  {
    title: "Continuous Monitoring",
    description: "Establish real-time dashboards to track key metrics.",
    icon: Monitor,
    status: 'coming_soon',
  },
  {
    title: "What-if Exploration",
    description: "Simulate strategic alternatives and explore potential future scenarios.",
    icon: FlaskConical,
    status: 'coming_soon',
  },
  {
    title: "Predictive Modeling",
    description: "Leverage machine learning to forecast future trends.",
    icon: BrainCircuit,
    status: 'coming_soon',
  },
];

const SECTIONS: Section[] = [
  { id: 'introduction', label: 'Introduction', level: 2 },
  { id: 'core-modules', label: 'Core Modules', level: 2 },
  { id: "why-skari", label: "Why It's Different", level: 2 },
  { id: 'getting-started', label: 'Getting Started', level: 2 },
];

const ModuleCard = ({
  title,
  description,
  icon: Icon,
  status,
  slug,
}: typeof CORE_MODULES[0]) => {
  const isClickable = slug && status !== 'coming_soon';

  const cardContent = (
    <Card className={`h-full transition-all ${isClickable ? 'hover:shadow-lg hover:-translate-y-1' : 'opacity-60 cursor-not-allowed'}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {status === 'beta' && (
          <div className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">BETA</div>
        )}
        {status === 'coming_soon' && (
          <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">COMING SOON</div>
        )}
      </CardHeader>
      <CardContent className="flex items-start gap-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return isClickable ? (
    <Link href={`/faq/${slug}`} className="block h-full no-underline">
      {cardContent}
    </Link>
  ) : (
    <div className="h-full">{cardContent}</div>
  );
};


export default function PlatformOverviewPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
      <article className="prose prose-slate max-w-none">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Platform Overview</h1>
          <p className="text-lg text-muted-foreground">
            An introduction to our suite of data analysis and decision-making tools.
          </p>
        </div>

        <section id="introduction" className="scroll-mt-24 mb-16">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            Introduction
          </h2>
          <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
              Welcome to our integrated analytics platform. Our mission is to empower you to turn raw data into clear insights and strategic decisions. From fundamental statistical tests to complex, domain-specific optimization, our tools are designed to be powerful yet accessible.
            </p>
            <p>
              This document provides a high-level overview of the core modules available in your workspace. Each module is designed for a specific stage of the data analysis lifecycle, from data preparation to strategic implementation.
            </p>
          </div>
        </section>

        <section id="core-modules" className="scroll-mt-24 mb-16 border-t pt-12">
          <h2 className="text-3xl font-bold mb-6">Core Modules</h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-8">
              Each module is a gateway to a specific set of tools. Click on any card to learn more about its features and use cases.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CORE_MODULES.map((module) => (
              <ModuleCard key={module.title} {...module} />
            ))}
          </div>
        </section>

        <section id="why-skari" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-primary" />
                Why Skari is Different
            </h2>
            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                <p>
                    Our platform is built to make data analysis accessible and insightful. Here’s what makes Skari unique:
                </p>
            </div>
            <div className="mt-8 grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-lg border bg-background">
                    <div className="flex items-center gap-3 mb-3">
                        <Wand2 className="w-6 h-6 text-primary" />
                        <h4 className="font-semibold text-lg">AI Analysis Recommendation</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Not sure where to start? Upload your data, and our AI will suggest the most appropriate statistical methods, guiding you to the right analysis.
                    </p>
                </div>
                <div className="p-6 rounded-lg border bg-background">
                    <div className="flex items-center gap-3 mb-3">
                        <Database className="w-6 h-6 text-primary" />
                        <h4 className="font-semibold text-lg">Learn with Example Datasets</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Explore any analysis with pre-loaded, relevant sample data. See how it works and what results to expect before using your own files.
                    </p>
                </div>
                <div className="p-6 rounded-lg border bg-background">
                    <div className="flex items-center gap-3 mb-3">
                        <BookOpen className="w-6 h-6 text-primary" />
                        <h4 className="font-semibold text-lg">Built-in Analysis Guides</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Every analysis comes with a guide explaining the method, its use cases, and how to interpret the results—no statistics degree required.
                    </p>
                </div>
                <div className="p-6 rounded-lg border bg-background">
                    <div className="flex items-center gap-3 mb-3">
                        <HelpCircle className="w-6 h-6 text-primary" />
                        <h4 className="font-semibold text-lg">Interactive Glossary</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Confused by a term like "p-value" or "coefficient"? Click the help icon next to any statistical term for a simple, clear definition.
                    </p>
                </div>
                <div className="p-6 rounded-lg border bg-background">
                    <div className="flex items-center gap-3 mb-3">
                        <Bot className="w-6 h-6 text-primary" />
                        <h4 className="font-semibold text-lg">AI Chat for Results Interpretation</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        After running an analysis, chat with our AI assistant. Ask questions about your results in plain language and get expert-level explanations instantly.
                    </p>
                </div>
                <div className="p-6 rounded-lg border bg-background">
                    <div className="flex items-center gap-3 mb-3">
                        <FileText className="w-6 h-6 text-primary" />
                        <h4 className="font-semibold text-lg">Publication-Ready Reports</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Download complete analysis results as formatted Word documents (.docx), including APA-style text, tables, and high-resolution charts.
                    </p>
                </div>
                <div className="p-6 rounded-lg border bg-background">
                    <div className="flex items-center gap-3 mb-3">
                        <Code className="w-6 h-6 text-primary" />
                        <h4 className="font-semibold text-lg">Reproducible Python Code</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Export the exact Python code used for your analysis. Perfect for assignments, peer review, or customizing in your own environment.
                    </p>
                </div>
            </div>
        </section>

        <section id="getting-started" className="scroll-mt-24 mb-16 border-t pt-12">
          <h2 className="text-3xl font-bold mb-6">Getting Started</h2>
          <div className="text-base text-muted-foreground leading-relaxed">
            <p className="mb-4">
              The best way to start is by selecting a module that aligns with your current goal.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>New to data analysis?</strong> Begin with <code className="bg-muted px-1.5 py-0.5 rounded-sm">Data Preparation</code> to clean your dataset, then move to <code className="bg-muted px-1.5 py-0.5 rounded-sm">Standard Analytics</code> to explore basic patterns.</li>
              <li><strong>Have a specific business problem?</strong> Jump into <code className="bg-muted px-1.5 py-0.5 rounded-sm">Strategic Decision</code> or <code className="bg-muted px-1.5 py-0.5 rounded-sm">Decision Analytics</code> to find optimal solutions.</li>
              <li><strong>Working with complex models?</strong> Use <code className="bg-muted px-1.5 py-0.5 rounded-sm">Structural Equation Modeling</code> for advanced causal analysis.</li>
            </ul>
          </div>
        </section>
      </article>
    </FaqArticleLayout>
  );
}

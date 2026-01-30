
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
  LayoutDashboard,
  ArrowRight,
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
        title: "Scenario",
        description: "Explore what-if scenarios and simulations.",
        icon: FlaskConical,
        status: 'live',
        slug: '/dashboard/scenario',
    },
    {
        title: "DataPrep",
        description: "Clean, transform, and prepare your data.",
        icon: Database,
        status: 'live',
        slug: '/dashboard/data-preprocessing',
    },
    {
        title: "Visualization",
        description: "Create insightful charts and graphs.",
        icon: Presentation,
        status: 'live',
        slug: '/dashboard/visualization',
    },
    {
        title: "Dashboards",
        description: "Build and monitor custom business dashboards.",
        icon: Monitor,
        status: 'live',
        slug: '/dashboard/dashboards',
    },
    {
        title: "Team",
        description: "Invite and manage team members.",
        icon: Users,
        status: 'live',
        slug: '/dashboard/team',
    },
    {
        title: "Decision Analytics",
        description: "Optimize decisions with programming models.",
        icon: Waypoints,
        status: 'live',
        slug: '/dashboard/optimization',
    },
    {
        title: "Derivatives Analysis",
        description: "Tools for options pricing and risk.",
        icon: DollarSign,
        status: 'live',
        slug: '/dashboard/derivatives',
    },
    {
        title: "SEM",
        description: "Model complex structural equations.",
        icon: Network,
        status: 'live',
        slug: '/dashboard/sem',
    },
    {
        title: "Survey Tool",
        description: "Coming soon...",
        icon: ClipboardList,
        status: 'coming_soon',
    },
    {
        title: "Machine Learning",
        description: "Coming soon...",
        icon: BrainCircuit,
        status: 'coming_soon',
    },
];

const SECTIONS: Section[] = [
  { id: 'introduction', label: 'Introduction', level: 2 },
  { id: 'workspace', label: 'The Workspace', level: 2},
  { id: 'workspace-tools', label: 'Workspace Tools', level: 2 },
  { id: "why-skari", label: "Why It's Different", level: 2 },
  { id: 'common-actions', label: 'Common Actions', level: 2},
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
    <Link href={`${slug}`} className="block h-full no-underline">
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

        <section id="workspace" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <LayoutDashboard className="w-7 h-7 text-primary" />
                The Workspace
            </h2>
            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                <p>
                    The Workspace is the first screen you see after logging in. It's designed to be your <strong className="text-foreground">central hub</strong> or "mission control center" for all activities on the platform. From here, you can launch different analysis tools, manage your projects, and access account settings.
                </p>
                <p>
                    Think of it as the main menu of a powerful software suite. Each tool is designed for a specific purpose, and the workspace provides a unified entry point to all of them.
                </p>
            </div>
        </section>

        <section id="workspace-tools" className="scroll-mt-24 mb-16 border-t pt-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Wrench className="w-7 h-7 text-primary" />
            Workspace Tools
          </h2>
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
                Why It's Different
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
                        Export any analysis as clean, executable Python code to integrate into your existing data pipelines or for further customization.
                    </p>
                </div>
                <div className="p-6 rounded-lg border bg-background">
                    <div className="flex items-center gap-3 mb-3">
                        <Wrench className="w-6 h-6 text-primary" />
                        <h4 className="font-semibold text-lg">Integrated Data Preparation</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Clean, transform, handle missing values, and prepare your data for analysis without leaving the platform.
                    </p>
                </div>
            </div>
        </section>

        <section id="common-actions" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <HelpCircle className="w-7 h-7 text-primary" />
                Common Actions
            </h2>
            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                <div className="flex items-start gap-4">
                    <ArrowRight className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-foreground">Starting an Analysis</h4>
                        <p>Simply click on one of the tool cards (e.g., "Scenario," "DataPrep," "Optimization") to launch that specific workspace.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <ArrowRight className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-foreground">Managing Your Account</h4>
                        <p>Click on your user icon in the top-right corner to access your profile, settings, and billing information, or to log out.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <ArrowRight className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-foreground">Getting Help</h4>
                        <p>The "Support" or "Help Center" links in the main navigation or user menu will take you to this documentation.</p>
                    </div>
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
              <li><strong>New to data analysis?</strong> Begin with <code className="bg-muted px-1.5 py-0.5 rounded-sm">DataPrep</code> to clean your dataset, then move to an analysis tool.</li>
              <li><strong>Have a specific business problem?</strong> Jump into <code className="bg-muted px-1.5 py-0.5 rounded-sm">Decision Analytics</code> to find optimal solutions.</li>
              <li><strong>Working with complex models?</strong> Use <code className="bg-muted px-1.5 py-0.5 rounded-sm">SEM</code> for advanced causal analysis.</li>
            </ul>
          </div>
        </section>
      </article>
    </FaqArticleLayout>
  );
}

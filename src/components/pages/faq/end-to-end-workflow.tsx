'use client';

import React from 'react';
import {
  BookOpen,
  Upload,
  Settings2,
  FileSearch,
  Download,
  CheckCircle2,
  TrendingUp,
  Target,
  ArrowRight,
  Database,
  Lightbulb,
  Sigma,
  Workflow,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-is-workflow", label: "What is the Workflow?", level: 2 },
  { id: "five-step-process", label: "The 5-Step Process", level: 2 },
  { id: "example-workflow", label: "Example Workflow", level: 2 },
];

const WORKFLOW_STEPS = [
    {
        id: 1,
        label: 'Upload Data',
        icon: Upload,
        description: 'Upload your dataset or choose from our examples to get started.',
        details: 'Supported formats: CSV, Excel. Ensure your data has clear headers in the first row.'
    },
    {
        id: 2,
        label: 'Choose Your Path',
        icon: Workflow,
        description: 'Select the right tool for your goal: Standard Analysis or Strategic Decision.',
        details: 'Use Standard for statistical tests, and Strategic for business optimization.'
    },
    {
        id: 3,
        label: 'Configure & Run',
        icon: Settings2,
        description: 'Map variables, set parameters, and execute the analysis with a single click.',
        details: 'The system validates your data and settings before running to prevent common errors.'
    },
    {
        id: 4,
        label: 'Understand Results',
        icon: FileSearch,
        description: 'Review insights from the 3-layer results: Summary, Reasoning, and Statistics.',
        details: 'Start with the plain-language summary, then dive deeper as needed.'
    },
    {
        id: 5,
        label: 'Export & Share',
        icon: Download,
        description: 'Download your findings as Word reports, Python code, CSV tables, or images.',
        details: 'Create publication-ready materials or share actionable insights with your team.'
    },
];

export default function EndToEndWorkflowPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">End-to-End Workflow</h1>
            <p className="text-lg text-muted-foreground">
            From data upload to actionable insights in five simple steps
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Our platform streamlines the entire data analysis process into a consistent, guided workflow, allowing you to move from raw data to decision-ready insights quickly and efficiently."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Upload → Choose → Configure → Understand → Share.
            </p>
            </blockquote>
        </div>

        {/* WHAT IS THE WORKFLOW */}
        <section id="what-is-workflow" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What is the End-to-End Workflow?
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                The End-to-End Workflow is the <strong className="text-foreground">structured, step-by-step process</strong> that guides you through every stage of an analysis. It's designed to be intuitive and consistent across all tools on the platform.
            </p>
            <p>
                This workflow ensures that you don't miss critical steps like data validation or parameter configuration. It breaks down a complex process into manageable stages, making sophisticated analysis accessible to everyone, regardless of their statistical expertise.
            </p>
            </div>
        </section>

        {/* THE 5-STEP PROCESS */}
        <section id="five-step-process" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Workflow className="w-7 h-7 text-primary" />
            The 5-Step Process
            </h2>
            
            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                Every analysis on the platform, whether statistical or strategic, follows these five core steps.
            </p>

            <div className="space-y-8">
            {WORKFLOW_STEPS.map((step, index) => (
                <div key={step.id} className="flex gap-4">
                {/* Step Number & Connector */}
                <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    {step.id}
                    </div>
                    {index < WORKFLOW_STEPS.length - 1 && (
                    <div className="w-0.5 flex-1 bg-border mt-3 min-h-[40px]"></div>
                    )}
                </div>

                {/* Step Content */}
                <div className="flex-1 pb-4">
                    <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-xl">{step.label}</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed ml-14">
                    {step.description}
                    </p>
                    <div className="ml-14 mt-3 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                        {step.details}
                    </div>
                </div>
                </div>
            ))}
            </div>
        </section>

        {/* EXAMPLE WORKFLOW */}
        <section id="example-workflow" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-primary" />
            Example Workflow: Find Key Drivers
            </h2>
            
            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                Let's walk through a common business scenario: you want to understand what drives customer satisfaction.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <h4 className="font-semibold">Upload Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file of customer survey responses, including columns for "satisfaction_score," "price_rating," "service_quality," and "product_quality."
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <h4 className="font-semibold">Choose Your Path</h4>
                  <p className="text-sm text-muted-foreground">
                    Since you know your research goal is to understand relationships, you select "Standard Analysis" and then choose "Multiple Linear Regression" from the "Relationship" category.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <h4 className="font-semibold">Configure & Run</h4>
                  <p className="text-sm text-muted-foreground">
                    Set "satisfaction_score" as your dependent variable and "price_rating," "service_quality," and "product_quality" as your independent variables. Keep the default settings and click "Run Analysis."
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">4</div>
                <div>
                  <h4 className="font-semibold">Understand Results</h4>
                  <p className="text-sm text-muted-foreground">
                    Review the <strong className="text-foreground">Summary</strong>, which states: "Service quality and product quality are significant positive drivers of satisfaction, but price rating is not a significant factor." Check the <strong className="text-foreground">Statistics</strong> section to see the exact p-values and coefficients.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">5</div>
                <div>
                  <h4 className="font-semibold">Export & Share</h4>
                  <p className="text-sm text-muted-foreground">
                    Click "Download as Word (.docx)" to generate a complete report. Share this report with the product and customer service teams to highlight the importance of their work on overall satisfaction.
                  </p>
                </div>
              </div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}


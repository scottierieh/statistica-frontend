'use client';

import React from 'react';
import {
  Wand2,
  Bot,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Info,
  HelpCircle,
  Target,
  Layers,
  Lightbulb,
  Database,
  Settings2,
  FileSearch,
  TrendingUp,
  Users,
  Brain,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const ANALYSIS_STEPS = [
  { id: 1, label: 'Variables', icon: Database, description: 'Select which columns you want analyzed' },
  { id: 2, label: 'Analysis', icon: Settings2, description: 'Optionally describe your data and goals, then run' },
  { id: 3, label: 'Results', icon: FileSearch, description: 'Review data summary and AI recommendations' },
];

const SECTIONS: Section[] = [
  { id: "what-is", label: "What is Recommendation?", level: 2 },
  { id: "what-you-can-do", label: "What You Can Do", level: 2 },
  { id: "when-to-use", label: "When to Use", level: 2 },
  { id: "how-it-works", label: "How It Works", level: 2 },
];

export default function RecommendationOverviewPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Overview</h1>
            <p className="text-lg text-muted-foreground">
            Understanding AI Analysis Recommendation and when to use it
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Upload your data or select an example, and let AI recommend which statistical analyses are best for your research questions."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Select variables. Describe your goals. Get smart recommendations.
            </p>
            </blockquote>
        </div>

        {/* WHAT IS */}
        <section id="what-is" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What is Recommendation?
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                Recommendation is an AI-powered tool that <strong className="text-foreground">helps you figure out which statistical analysis to use</strong> when you're unsure where to start.
            </p>
            <p>
                Simply upload your data or select an example dataset, choose the variables you want to analyze, and optionally describe your research goals. The AI examines your data structure and recommends suitable statistical methods with explanations of why each method is appropriate for your data.
            </p>
            <p>
                Think of it as a knowledgeable advisor who says, "Based on your data, you should consider using a t-test for comparing groups, or try regression to predict outcomes." You can then proceed to run these recommended analyses in Standard Analysis.
            </p>
            </div>
        </section>

        {/* WHAT YOU CAN DO */}
        <section id="what-you-can-do" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-primary" />
            What You Can Do
            </h2>
            
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Get smart analysis suggestions automatically</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    AI examines your variable types (numeric, categorical), sample size, and data distribution to recommend the most appropriate statistical methods.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Start with example datasets to learn</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Use pre-loaded example datasets (Iris, Tips, Titanic) to see how AI recommendations work before analyzing your own data.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Provide context for better recommendations</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Optionally describe your data ("customer satisfaction survey") and research goals ("what drives satisfaction?") to get more accurate suggestions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Select analysis objectives from common goals</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Choose from predefined objectives like "Compare groups," "Find relationships," "Predict outcomes," or "Identify patterns" to guide the AI.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Receive a comprehensive data summary</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Get an overview of each variable including type (numeric/categorical), missing values, unique counts, mean, and standard deviation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">View multiple analysis recommendations with reasoning</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    AI suggests several analyses (e.g., t-test, ANOVA, regression) categorized by type, with clear explanations of why each method fits your data and which variables to use.
                  </p>
                </div>
              </div>
            </div>
        </section>

        {/* WHEN TO USE */}
        <section id="when-to-use" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-primary" />
            When to Use
            </h2>

            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            Use Recommendation when you're <strong className="text-foreground">unsure which analysis to run</strong> or want to 
            <strong className="text-foreground"> explore different approaches</strong> quickly.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base mb-1">You're new to statistical analysis</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Not familiar with t-tests, ANOVA, regression, or other methods. Let AI guide you to the right approach.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base mb-1">You don't know which test to use</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You have a research question but aren't sure if you need correlation, regression, ANOVA, or something else.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base mb-1">You want to explore multiple approaches</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Even experienced researchers can discover alternative methods they hadn't considered for their data.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base mb-1">You need a quick start</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Get immediate direction without spending time researching which statistical methods are appropriate for your data.
                  </p>
                </div>
              </div>
            </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
            <Brain className="w-7 h-7 text-primary" />
            How It Works: 3-Step Process
            </h2>

            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
            The Recommendation workflow is simple and fast. In just three steps, you'll go from raw data to AI-powered analysis suggestions.
            </p>

            <div className="space-y-8">
            {ANALYSIS_STEPS.map((step, index) => (
                <div key={step.id} className="flex gap-4">
                {/* Step Number & Connector */}
                <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    {step.id}
                    </div>
                    {index < ANALYSIS_STEPS.length - 1 && (
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

                    {/* Step-specific details */}
                    {step.id === 1 && (
                    <div className="ml-14 mt-4 p-4 bg-muted/30 rounded-lg">
                        <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>Select all variables or choose specific columns to analyze</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>AI will examine each variable's type, distribution, and missing values</span>
                        </li>
                        </ul>
                    </div>
                    )}

                    {step.id === 2 && (
                    <div className="ml-14 mt-4 p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium mb-2 text-foreground">Advanced Settings (Optional):</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span><strong>Data description:</strong> "Customer satisfaction survey data"</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span><strong>Analysis goal:</strong> "What factors drive satisfaction scores?"</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span><strong>Objectives:</strong> Select from predefined goals like "Compare groups" or "Find relationships"</span>
                        </li>
                        </ul>
                    </div>
                    )}

                    {step.id === 3 && (
                    <div className="ml-14 mt-4 p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium mb-2 text-foreground">You'll receive:</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <FileSearch className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span><strong>Data Summary:</strong> Variable types, missing values, basic statistics</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Bot className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span><strong>Analysis Recommendations:</strong> Multiple suggested methods with explanations</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span><strong>Variable Suggestions:</strong> Which variables to use for each analysis</span>
                        </li>
                        </ul>
                    </div>
                    )}
                </div>
                </div>
            ))}
            </div>

            <div className="mt-8 p-5 bg-primary/5 border-l-4 border-primary rounded">
            <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">What happens next?</strong> Use the recommendations as a guide to select the appropriate analysis from Standard Analysis. The AI tells you which methods fit your data, then you can run those analyses with full control over settings and parameters.
            </p>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}

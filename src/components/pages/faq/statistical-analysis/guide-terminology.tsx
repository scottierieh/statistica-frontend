
'use client';

import React from 'react';
import {
  BookOpen,
  HelpCircle,
  FileText,
  Lightbulb,
  Info,
  Search,
  GraduationCap,
  Library,
  MessageCircleQuestion,
  Sparkles,
  CheckCircle2,
  Bot,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-is", label: "What are Guides & Terminology?", level: 2 },
  { id: "analysis-guides", label: "Analysis Guides", level: 2 },
  { id: "statistical-glossary", label: "Statistical Glossary", level: 2 },
  { id: "how-to-access", label: "How to Access", level: 2 },
];

export default function GuidesTerminologyOverviewPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Overview</h1>
            <p className="text-lg text-muted-foreground">
            Understanding analysis methods and statistical concepts
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Access analysis guides and statistical term definitions anytime, anywhere in the platform to help you understand methods and interpret results."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Learn. Understand. Apply.
            </p>
            </blockquote>
        </div>

        {/* WHAT ARE GUIDES & TERMINOLOGY */}
        <section id="what-is" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What are Guides & Terminology?
            </h2>
            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                Throughout the platform, you have access to <strong className="text-foreground">contextual help resources</strong> that explain statistical concepts, analysis methods, and technical terms. These resources are available on every analysis page, so you can get help exactly when you need it.
            </p>
            <p>
                Whether you're a beginner learning statistics or an experienced practitioner, these guides and definitions help you understand what each analysis does, when to use it, and how to interpret the results.
            </p>
            <p>
                Think of this as your built-in statistics textbook and dictionary, always available at your fingertips.
            </p>
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Analysis Guides</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Detailed explanations of each statistical analysis method, including when to use it, key assumptions, and how to interpret results.
                </p>
                <div className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Example:</strong> Social Network Analysis Guide explains centrality measures, directed vs undirected networks, and community detection.
                </div>
              </div>

              <div className="p-6 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <HelpCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Statistical Glossary</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Quick definitions of statistical terms and concepts you'll encounter throughout your analyses.
                </p>
                <div className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Example:</strong> Click the "?" icon next to "p-value" to see a simple explanation: "The probability that your results occurred by chance."
                </div>
              </div>
            </div>
        </section>

        {/* ANALYSIS GUIDES */}
        <section id="analysis-guides" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <FileText className="w-7 h-7 text-primary" />
            Analysis Guides
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                Analysis Guides are <strong className="text-foreground">comprehensive explanations</strong> of each statistical method available in the platform. They're designed to help you understand not just how to run an analysis, but when it's appropriate and how to make sense of the results.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">What's in an Analysis Guide?</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Lightbulb className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">What is this analysis?</h4>
                      <p className="text-sm text-muted-foreground">
                        Plain-language explanation of what the analysis does and what research questions it answers.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">When to use it?</h4>
                      <p className="text-sm text-muted-foreground">
                        Specific scenarios and data types where this analysis is appropriate. Includes examples of research questions.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Info className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Key concepts explained</h4>
                      <p className="text-sm text-muted-foreground">
                        Important concepts specific to this analysis (e.g., centrality measures in network analysis, assumptions in regression).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">How to interpret results</h4>
                      <p className="text-sm text-muted-foreground">
                        Guidance on reading output tables, understanding key metrics, and drawing conclusions from the analysis.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Example: Social Network Analysis Guide</h3>
                <div className="p-5 rounded-lg border bg-background">
                  <div className="mb-4">
                    <h4 className="font-semibold text-primary mb-2">📊 What is Social Network Analysis?</h4>
                    <p className="text-sm text-muted-foreground">
                      SNA studies relationships and flows between people, groups, organizations, or other entities. It uses graph theory to model networks as nodes (entities) and edges (connections).
                    </p>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Key Questions SNA Answers:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Who are the most influential/connected individuals?</li>
                      <li>• Who bridges different groups?</li>
                      <li>• Are there distinct communities or clusters?</li>
                      <li>• How quickly can information spread?</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Directed vs Undirected Networks</h4>
                    <div className="grid md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-muted rounded">
                        <strong>Undirected:</strong> Edges have no direction (A↔B)<br/>
                        Examples: Friendships, collaborations
                      </div>
                      <div className="p-3 bg-muted rounded">
                        <strong>Directed:</strong> Edges have direction (A→B ≠ B→A)<br/>
                        Examples: Email sent, follows, citations
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-800 dark:text-sky-200 mb-1">Guides are Context-Aware</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      When you're setting up a specific analysis, the guide for that exact method appears. You don't need to search through a manual—the right help is already there.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* STATISTICAL GLOSSARY */}
        <section id="statistical-glossary" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-primary" />
            Statistical Glossary
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                The Statistical Glossary provides <strong className="text-foreground">quick, clear definitions</strong> of technical terms you'll encounter throughout your analyses. Each term is explained in simple language without overwhelming jargon.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">How It Works</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Look for the "?" icon</p>
                      <p className="text-sm text-muted-foreground">Throughout the interface, you'll see question mark icons next to technical terms</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Click to see definition</p>
                      <p className="text-sm text-muted-foreground">A tooltip or popup appears with a simple explanation of the term</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Continue your work</p>
                      <p className="text-sm text-muted-foreground">Understanding the term helps you make better decisions about your analysis</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Example Glossary Terms</h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border bg-background">
                    <div className="flex items-start gap-3 mb-2">
                      <MessageCircleQuestion className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <h4 className="font-semibold">p-value</h4>
                    </div>
                    <p className="text-sm text-muted-foreground ml-8">
                      The probability that your results occurred by random chance. A p-value less than 0.05 (5%) typically means the result is "statistically significant"—unlikely to be due to chance alone.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border bg-background">
                    <div className="flex items-start gap-3 mb-2">
                      <MessageCircleQuestion className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <h4 className="font-semibold">Confidence Interval (CI)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground ml-8">
                      A range of values where the true value likely falls. A 95% confidence interval means if you repeated the study 100 times, about 95 of those intervals would contain the true value.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border bg-background">
                    <div className="flex items-start gap-3 mb-2">
                      <MessageCircleQuestion className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <h4 className="font-semibold">Coefficient</h4>
                    </div>
                    <p className="text-sm text-muted-foreground ml-8">
                      In regression, a coefficient shows how much the dependent variable changes when the independent variable increases by 1 unit. For example, a coefficient of 0.85 for "study hours" means each additional study hour increases test scores by 0.85 points.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border bg-background">
                    <div className="flex items-start gap-3 mb-2">
                      <MessageCircleQuestion className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <h4 className="font-semibold">R² (R-squared)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground ml-8">
                      The proportion of variance in the dependent variable explained by your independent variables. An R² of 0.68 means your model explains 68% of the variation in the outcome.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border bg-background">
                    <div className="flex items-start gap-3 mb-2">
                      <MessageCircleQuestion className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <h4 className="font-semibold">Standard Error (SE)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground ml-8">
                      A measure of uncertainty in your estimate. Smaller standard errors mean more precise estimates. It's used to calculate confidence intervals and test statistics.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Definitions are Beginner-Friendly</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      We avoid technical jargon and use everyday language. If you're new to statistics, you can understand these definitions. If you're experienced, they serve as quick reminders.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* HOW TO ACCESS */}
        <section id="how-to-access" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Search className="w-7 h-7 text-primary" />
            How to Access Guides & Terminology
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                These help resources are available <strong className="text-foreground">on every analysis page</strong>, so you never have to leave your workflow to find help.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">Where You'll Find Them</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <Library className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">Analysis Guide Button</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Look for the "Analysis Guide" button at the top of every analysis page. Click it to open a detailed guide for that specific analysis method.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-background rounded border">
                        <BookOpen className="w-4 h-4" />
                        <span>Typically labeled "Analysis Guide" or with a book icon</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <MessageCircleQuestion className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">Question Mark Icons</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Throughout the interface, you'll see "?" icons next to technical terms. Click any of these to see a quick definition.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-background rounded border">
                        <HelpCircle className="w-4 h-4" />
                        <span>Appears next to terms like "p-value", "coefficient", "CI", etc.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Available Everywhere</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">During Variable Selection</h4>
                    <p className="text-xs text-muted-foreground">
                      Get help understanding what dependent vs independent variables mean
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">During Settings Configuration</h4>
                    <p className="text-xs text-muted-foreground">
                      Learn what each parameter does before changing it
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">During Validation</h4>
                    <p className="text-xs text-muted-foreground">
                      Understand what assumptions are being checked and why they matter
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-sm">When Viewing Results</h4>
                    <p className="text-xs text-muted-foreground">
                      Interpret statistics and understand what they mean for your research
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-primary/5 border-l-4 border-primary rounded">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Pro Tip:</strong> Don't hesitate to click on help icons, even if you think you know the term. Sometimes a quick refresher helps ensure you're interpreting results correctly, and you might learn nuances you hadn't considered before.
                </p>
              </div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}

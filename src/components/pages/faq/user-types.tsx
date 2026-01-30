'use client';

import React from 'react';
import {
  BookOpen,
  Users,
  GraduationCap,
  Briefcase,
  TrendingUp,
  BarChart3,
  FileText,
  Target,
  Sigma,
  Lightbulb,
  BrainCircuit,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-is-user-types", label: "What are User Types?", level: 2 },
  { id: "data-analyst", label: "Data Analyst", level: 2 },
  { id: "student-researcher", label: "Student & Researcher", level: 2 },
  { id: "business-user", label: "Business User & Decision Maker", level: 2 },
  { id: "data-scientist", label: "Data Scientist", level: 2 },
];

export default function UserTypesPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">User Types</h1>
            <p className="text-lg text-muted-foreground">
            Understanding who can benefit from our platform and how
            </p>
        </div>

        {/* WHAT IS USER TYPES */}
        <section id="what-is-user-types" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What are User Types?
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                Our platform is designed to be versatile, catering to the unique needs of different professionals and learners. We've tailored our tools and workflows to support several primary user types, ensuring that everyone from a seasoned data scientist to a business executive can extract value from their data.
            </p>
            <p>
                Whether you need to perform complex statistical modeling, complete an academic assignment, or make a quick, data-informed business decision, our platform has a workflow for you.
            </p>
            </div>
        </section>

        {/* DATA ANALYST */}
        <section id="data-analyst" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-primary" />
            Data Analyst
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                For data analysts and BI professionals who need a powerful, flexible tool for deep-dive analysis without the overhead of complex coding environments.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">Key Benefits</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Full Control Over Analysis</p>
                      <p className="text-sm text-muted-foreground">
                        Use <strong>Standard Analysis</strong> to access over 80 statistical methods, customize every parameter, and validate assumptions.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Rapid Reporting</p>
                      <p className="text-sm text-muted-foreground">
                        Export results to Word, download APA-formatted text, and save charts as high-resolution images to quickly build reports for stakeholders.
                      </p>
                    </div>
                  </div>
                   <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Advanced Modeling</p>
                      <p className="text-sm text-muted-foreground">
                        Leverage <strong>Strategic Decision</strong> and <strong>SEM</strong> tools for complex optimization, forecasting, and causal modeling.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* STUDENT & RESEARCHER */}
        <section id="student-researcher" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <GraduationCap className="w-7 h-7 text-primary" />
            Student & Researcher
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                For students, academic researchers, and anyone eager to learn statistics. Our platform provides reliable tools for academic work and guided learning experiences.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">Key Benefits</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Sigma className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Explore Statistical Methods with Examples</p>
                      <p className="text-sm text-muted-foreground">
                        Use <strong>Standard Analysis</strong> with pre-loaded example datasets to see how different tests work and understand their results.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Learn Strategic Business Applications</p>
                      <p className="text-sm text-muted-foreground">
                        Explore the <strong>Strategic Decision</strong> modules to see how statistical optimization is applied to solve real-world business problems.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Learn by Doing</p>
                      <p className="text-sm text-muted-foreground">
                        Use built-in <strong>Analysis Guides</strong> and <strong>Glossary</strong> terms to understand statistical concepts and methods as you work.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Publication-Ready Output</p>
                      <p className="text-sm text-muted-foreground">
                        Get results in APA format and export tables and charts that are ready to be included in your papers.
                      </p>
                    </div>
                  </div>
                   <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Reproducible Research</p>
                      <p className="text-sm text-muted-foreground">
                        Export the exact Python code used for your analysis to ensure your work is transparent and reproducible for peer review.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* BUSINESS USER */}
        <section id="business-user" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-primary" />
            Business User & Decision Maker
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                For managers, executives, and other stakeholders who need to make data-informed decisions without getting lost in technical details.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">Key Benefits</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Focus on Business Outcomes</p>
                      <p className="text-sm text-muted-foreground">
                        Use <strong>Strategic Decision</strong> modules to solve specific business problems like churn reduction, budget allocation, and operational efficiency.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Plain-Language Summaries</p>
                      <p className="text-sm text-muted-foreground">
                        Every analysis includes a clear, concise <strong>Summary</strong> that explains the key findings and actionable insights without statistical jargon.
                      </p>
                    </div>
                  </div>
                   <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Track Performance with Dashboards</p>
                      <p className="text-sm text-muted-foreground">
                        Use the <strong>Dashboard</strong> module to monitor key metrics and business health in real-time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* DATA SCIENTIST */}
        <section id="data-scientist" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <BrainCircuit className="w-7 h-7 text-primary" />
                Data Scientist
            </h2>
            <div className="space-y-6">
                <p className="text-base text-muted-foreground leading-relaxed">
                    For data scientists who need to rapidly prototype models, run complex analyses, and integrate results into larger data pipelines.
                </p>
                <div>
                    <h3 className="text-xl font-semibold mb-4">Key Benefits</h3>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">Rapid Prototyping</p>
                                <p className="text-sm text-muted-foreground">
                                    Quickly test hypotheses with various statistical methods and machine learning models without extensive boilerplate code.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">Machine Learning Workflows</p>
                                <p className="text-sm text-muted-foreground">
                                    Utilize the upcoming <strong>Machine Learning</strong> module to train, evaluate, and compare models for classification and regression tasks.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">Reproducible Code Export</p>
                                <p className="text-sm text-muted-foreground">
                                    Export any analysis as clean, executable Python code to integrate into your existing data pipelines or for further customization.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}

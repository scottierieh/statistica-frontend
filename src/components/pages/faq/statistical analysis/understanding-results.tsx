'use client';

import React from 'react';
import {
  Sigma,
  CheckCircle2,
  BookOpen,
  FileSearch,
  Lightbulb,
  Users,
  GraduationCap,
  Briefcase,
  TrendingUp,
  BarChart3,
  FileText,
  Download,
  Presentation,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const RESULT_LAYERS = [
  {
    id: 4,
    icon: FileSearch,
    label: 'Summary',
    tagline: 'Plain-language conclusion',
    audience: 'Non-technical stakeholders, executives, quick overview',
    description: 'Business-friendly explanation of what the analysis found, without statistical jargon',
    includes: [
      'Key findings in 1-3 sentences',
      'Practical implications for decision-making',
      'No technical terms (p-value, coefficient, degrees of freedom)'
    ],
    example: '"Study hours have a significant positive effect on test scores. Students who study more tend to score higher on exams."'
  },
  {
    id: 5,
    icon: Lightbulb,
    label: 'Reasoning',
    tagline: 'Why this conclusion',
    audience: 'Anyone wanting to understand the logic, learners, verification',
    description: 'Explains the statistical logic behind the summary conclusion in accessible terms',
    includes: [
      'Why the summary conclusion is valid',
      'Evidence from the analysis explained simply',
      'Context, limitations, and caveats',
      'Statistical concepts without heavy jargon'
    ],
    example: '"The p-value (p &lt; 0.001) means there\'s less than 0.1% chance this pattern occurred randomly. The R² of 0.68 shows study hours explain 68% of score variation."'
  },
  {
    id: 6,
    icon: Sigma,
    label: 'Statistics',
    tagline: 'Complete technical output',
    audience: 'Academic researchers, data scientists, publication preparation',
    description: 'Full statistical output with all technical details in APA format',
    includes: [
      'Detailed tables: coefficients, SE, t-statistics, p-values, 95% CI',
      'Visualizations: scatterplots, residual plots, distributions',
      'APA-formatted text ready to copy into papers',
      'Model diagnostics: R²/Adjusted R², VIF, Durbin-Watson'
    ],
    example: '"F(1, 98) = 147.38, p &lt; .001, R² = .68. The regression coefficient was 0.85 (95% CI [0.71, 0.99], t = 12.14, p &lt; .001)."'
  }
];

const SECTIONS: Section[] = [
  { id: "what-are-results", label: "What are Results?", level: 2 },
  { id: "step-summary", label: "Step 4: Summary", level: 2 },
  { id: "step-reasoning", label: "Step 5: Reasoning", level: 2 },
  { id: "step-statistics", label: "Step 6: Statistics", level: 2 },
  { id: "how-to-use", label: "How to Use Results", level: 2 },
];

export default function ResultsOverviewPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Overview</h1>
            <p className="text-lg text-muted-foreground">
            Understanding your analysis results
            </p>
        </div>

        {/* INTRO QUOTE */}
        <div className="mb-12 pb-8 border-b">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
            <p className="text-xl italic leading-relaxed text-foreground mb-3">
                "Results are presented in three progressive layers: a plain-language Summary, statistical Reasoning, and complete Statistics—designed for different audiences and use cases."
            </p>
            <p className="text-base text-muted-foreground font-medium not-italic">
                Summary. Reasoning. Statistics.
            </p>
            </blockquote>
        </div>

        {/* WHAT ARE RESULTS */}
        <section id="what-are-results" className="scroll-mt-24 mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What are Results?
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
                Results are the <strong className="text-foreground">output of your statistical analysis</strong>—what you get after running the test. They tell you what patterns exist in your data, whether those patterns are statistically significant, and what they mean for your research question.
            </p>
            <p>
                Instead of overwhelming you with technical output all at once, results are organized into <strong className="text-foreground">three progressive layers</strong>. Start with the Summary for a quick takeaway, read the Reasoning to understand why, then dive into Statistics for complete technical details.
            </p>
            <p>
                This layered approach means everyone can get what they need: executives get quick insights, learners understand the logic, and researchers get publication-ready output.
            </p>
            </div>

            <div className="mt-8 grid md:grid-cols-3 gap-4">
              <div className="p-5 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    4
                  </div>
                  <FileSearch className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Summary</h3>
                <p className="text-sm text-muted-foreground">Plain-language conclusion</p>
              </div>
              <div className="p-5 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    5
                  </div>
                  <Lightbulb className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Reasoning</h3>
                <p className="text-sm text-muted-foreground">Why this conclusion</p>
              </div>
              <div className="p-5 rounded-lg border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    6
                  </div>
                  <Sigma className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">Statistics</h3>
                <p className="text-sm text-muted-foreground">Complete technical output</p>
              </div>
            </div>
        </section>

        {/* STEP 4: SUMMARY */}
        <section id="step-summary" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <FileSearch className="w-7 h-7 text-primary" />
            Step 4: Summary
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                The Summary provides a <strong className="text-foreground">plain-language conclusion</strong> about what your analysis found, written without statistical jargon. This is what you'd tell a colleague who asks "So what did you find?"
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">What's Included</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Key findings (1-3 sentences)</p>
                      <p className="text-sm text-muted-foreground">The main takeaway in everyday language</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Practical implications</p>
                      <p className="text-sm text-muted-foreground">What this means for decisions or actions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">No technical jargon</p>
                      <p className="text-sm text-muted-foreground">No p-values, coefficients, or degrees of freedom</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Example Summary</h3>
                <div className="p-5 bg-muted/30 rounded-lg border">
                  <p className="text-sm text-muted-foreground italic mb-3">
                    "Study hours have a significant positive effect on test scores. Students who study more tend to score higher on exams, and this relationship is strong and consistent across the data."
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Practical implication:</strong> Encouraging students to increase study time is likely to improve test performance.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Best For</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg border">
                    <Briefcase className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Business Presentations</p>
                      <p className="text-sm text-muted-foreground">Share findings with executives or stakeholders</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border">
                    <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Quick Updates</p>
                      <p className="text-sm text-muted-foreground">Email summaries or status reports</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* STEP 5: REASONING */}
        <section id="step-reasoning" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Lightbulb className="w-7 h-7 text-primary" />
            Step 5: Reasoning
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                The Reasoning section <strong className="text-foreground">explains why the Summary conclusion is valid</strong> by walking through the statistical logic in accessible terms. It bridges the gap between the plain-language summary and the technical statistics.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">What's Included</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Statistical logic explained</p>
                      <p className="text-sm text-muted-foreground">Why the data supports the conclusion, without heavy jargon</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Evidence from the analysis</p>
                      <p className="text-sm text-muted-foreground">Key statistics (p-values, R², effect sizes) explained simply</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Context and limitations</p>
                      <p className="text-sm text-muted-foreground">What the results can and cannot tell you</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Accessible explanations</p>
                      <p className="text-sm text-muted-foreground">E.g., &quot;p &lt; 0.001 means less than 0.1% chance this is random&quot;</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Example Reasoning</h3>
                <div className="p-5 bg-muted/30 rounded-lg border space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Why is this relationship significant?</strong> The p-value (p &lt; 0.001) indicates there's less than a 0.1% probability that this pattern occurred by random chance. This is well below the standard 5% threshold, giving us high confidence in the finding.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">How strong is the effect?</strong> The R² value of 0.68 means study hours explain 68% of the variation in test scores. This is considered a large effect in educational research.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">What are the limitations?</strong> This is observational data, not an experiment, so we can't definitively prove causation. Other factors like prior knowledge or test-taking skills could also play a role.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Best For</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg border">
                    <GraduationCap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Learning & Understanding</p>
                      <p className="text-sm text-muted-foreground">Students or anyone new to statistics</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Verification</p>
                      <p className="text-sm text-muted-foreground">Double-checking your interpretation</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* STEP 6: STATISTICS */}
        <section id="step-statistics" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Sigma className="w-7 h-7 text-primary" />
            Step 6: Statistics
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                The Statistics section provides <strong className="text-foreground">complete technical output</strong> in APA format, ready for academic papers, research reports, or detailed analysis. This is where you find all the numbers, tables, and charts.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">What's Included</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Detailed statistical tables</p>
                      <p className="text-sm text-muted-foreground">Coefficients, standard errors, t-statistics, p-values, 95% confidence intervals</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Visualizations</p>
                      <p className="text-sm text-muted-foreground">Scatterplots, residual plots, distribution charts, effect size visualizations</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">APA-formatted text</p>
                      <p className="text-sm text-muted-foreground">Ready-to-copy sentences for papers: "F(1, 98) = 147.38, p &lt; .001, R² = .68"</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Model diagnostics</p>
                      <p className="text-sm text-muted-foreground">R²/Adjusted R², VIF, Durbin-Watson, Cook's Distance, residual analysis</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Example Statistics Output</h3>
                <div className="p-5 bg-muted/30 rounded-lg border space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">APA-FORMATTED TEXT:</p>
                    <p className="text-sm font-mono bg-background p-3 rounded">
                      F(1, 98) = 147.38, p &lt; .001, R² = .68
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">COEFFICIENT TABLE:</p>
                    <div className="overflow-x-auto">
                      <table className="text-xs w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2">Variable</th>
                            <th className="text-right p-2">B</th>
                            <th className="text-right p-2">SE</th>
                            <th className="text-right p-2">t</th>
                            <th className="text-right p-2">p</th>
                            <th className="text-right p-2">95% CI</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-t">
                            <td className="p-2">Intercept</td>
                            <td className="text-right p-2">45.32</td>
                            <td className="text-right p-2">3.21</td>
                            <td className="text-right p-2">14.12</td>
                            <td className="text-right p-2">&lt;.001</td>
                            <td className="text-right p-2">[38.95, 51.69]</td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Study Hours</td>
                            <td className="text-right p-2">0.85</td>
                            <td className="text-right p-2">0.07</td>
                            <td className="text-right p-2">12.14</td>
                            <td className="text-right p-2">&lt;.001</td>
                            <td className="text-right p-2">[0.71, 0.99]</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Best For</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg border">
                    <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Academic Papers</p>
                      <p className="text-sm text-muted-foreground">Copy APA text directly into your manuscript</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border">
                    <BarChart3 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Deep Analysis</p>
                      <p className="text-sm text-muted-foreground">Check assumptions, diagnostics, effect sizes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border">
                    <Download className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Data Export</p>
                      <p className="text-sm text-muted-foreground">Download tables, charts, or complete reports</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border">
                    <GraduationCap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Learning Statistics</p>
                      <p className="text-sm text-muted-foreground">See how professional output should look</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* HOW TO USE */}
        <section id="how-to-use" className="scroll-mt-24 mb-16 border-t pt-12">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-primary" />
            How to Use Results
            </h2>
            
            <div className="space-y-6">
              <p className="text-base text-muted-foreground leading-relaxed">
                The three-layer structure is designed for <strong className="text-foreground">progressive disclosure</strong>—start simple and go deeper as needed.
              </p>

              <div>
                <h3 className="text-xl font-semibold mb-4">Recommended Workflow</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Read the Summary first</p>
                      <p className="text-sm text-muted-foreground">Get the main takeaway in plain language</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Check the Reasoning if you want to understand why</p>
                      <p className="text-sm text-muted-foreground">See the statistical logic explained accessibly</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Dive into Statistics for complete details</p>
                      <p className="text-sm text-muted-foreground">Get technical output, tables, and charts</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      4
                    </div>
                    <div>
                      <p className="font-medium">Export what you need</p>
                      <p className="text-sm text-muted-foreground">Download reports, code, or individual elements</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Use Cases by Audience</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-2">
                      <Presentation className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold">For Presentations</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Use Summary for slides, add 1-2 key statistics from Statistics section for credibility</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold">For Academic Papers</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Use Statistics section exclusively—copy APA text and paste tables/charts directly</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold">For Learning</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Read all three layers to connect plain language → logic → technical details</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold">For Business Decisions</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Summary + Reasoning provides context and confidence without overwhelming detail</p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-primary/5 border-l-4 border-primary rounded">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Pro Tip:</strong> You don't need to use all three layers every time. Choose what fits your audience. Executives usually only need the Summary, while peer reviewers will expect full Statistics.
                </p>
              </div>
            </div>
        </section>
        </article>
    </FaqArticleLayout>
  );
}

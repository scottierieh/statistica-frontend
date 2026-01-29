'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Bot, Sparkles, CheckCircle2, BookOpen, Info, HelpCircle, Target, Layers, Lightbulb, Database, Settings2, FileSearch } from 'lucide-react';

export default function AnalysisRecommendationPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Recommendation</h1>
        <p className="text-lg text-muted-foreground">
          Understanding AI Analysis Recommendation and when to use it
        </p>
      </div>

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

      <section id="what-you-can-do" className="scroll-mt-24 mb-16 border-t pt-12">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-primary" />
          What You Can Do
        </h2>
        <p>Content for this section is coming soon.</p>
      </section>

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
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 mb-16 border-t pt-12">
        <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <Bot className="w-7 h-7 text-primary" />
          How It Works: 3-Step Process
        </h2>
        <p>Content for this section is coming soon.</p>
      </section>

    </article>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import {
  Calculator,
  ShieldCheck,
  Sliders,
  FileText,
  Variable,
  Settings2,
  FileSearch,
  Lightbulb,
  Sigma,
  CheckCircle2,
  BookOpen,
  Info,
  HelpCircle
} from 'lucide-react';

// ============================================================
// 섹션 정의 (Table of Contents)
// ============================================================
const SECTIONS = [
  { id: 'what-is', label: 'What is Standard Analysis?' },
  { id: 'when-to-use', label: 'When to Use' },
  { id: 'key-features', label: 'Key Features' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'comparison', label: 'Comparison' }
];

// ============================================================
// Key Features 정의
// ============================================================
const KEY_FEATURES = [
  {
    icon: Calculator,
    label: 'Method-Based Selection',
    description: 'Choose the exact statistical test you need from 100+ available methods (T-Test, ANOVA, Regression, Chi-Square, Factor Analysis, etc.)'
  },
  {
    icon: ShieldCheck,
    label: 'Built-in Assumption Checks',
    description: 'Automatically validates statistical assumptions such as normality, homogeneity of variance, and independence before running tests'
  },
  {
    icon: Sliders,
    label: 'Flexible Configuration',
    description: 'Customize analysis parameters including alpha levels (0.01, 0.05, 0.10), post-hoc tests, and confidence intervals (90%, 95%, 99%)'
  },
  {
    icon: FileText,
    label: 'Complete Statistical Output',
    description: 'Access full tables, p-values, effect sizes, confidence intervals, and publication-ready visualizations for academic or business use'
  }
];

// ============================================================
// 6-Step Process 정의
// ============================================================
const ANALYSIS_STEPS = [
  {
    id: 1,
    icon: Variable,
    label: 'Variables',
    description: 'Select your dependent and independent variables for the analysis'
  },
  {
    id: 2,
    icon: Settings2,
    label: 'Settings',
    description: 'Configure analysis-specific parameters such as alpha levels, post-hoc tests, confidence intervals, and other options'
  },
  {
    id: 3,
    icon: ShieldCheck,
    label: 'Validation',
    description: 'The system automatically checks your data against statistical assumptions (e.g., normality, homogeneity) required for the chosen test'
  },
  {
    id: 4,
    icon: FileSearch,
    label: 'Summary',
    description: 'Review a high-level, business-friendly summary of the key findings without technical jargon'
  },
  {
    id: 5,
    icon: Lightbulb,
    label: 'Reasoning',
    description: 'Understand the "why" behind the summary with clear explanations of the statistical logic and implications'
  },
  {
    id: 6,
    icon: Sigma,
    label: 'Statistics',
    description: 'Dive into the full statistical output including detailed tables, test statistics, p-values, effect sizes, and charts'
  }
];

// ============================================================
// 메인 Overview 컴포넌트
// ============================================================
export default function OverviewPage() {
  const [activeSection, setActiveSection] = useState('what-is');
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Intersection Observer로 현재 섹션 추적
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    
    SECTIONS.forEach(section => {
      const element = sectionRefs.current[section.id];
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setActiveSection(section.id);
            }
          });
        },
        { rootMargin: '-100px 0px -80% 0px' }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,256px] gap-8">
          {/* 메인 콘텐츠 - 하나의 큰 Card */}
          <div className="min-w-0">
            <Card>
              <CardContent className="p-8">
                <article className="prose prose-slate max-w-none">
              {/* What is Standard Analysis */}
              <section 
                id="what-is" 
                ref={el => { sectionRefs.current['what-is'] = el; }}
                className="scroll-mt-24 mb-16"
              >
                <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                  <BookOpen className="w-7 h-7 text-primary" />
                  What is Standard Analysis?
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed mb-4">
                  Standard Analysis provides direct access to individual statistical methods. 
                  You choose the specific test you need (T-Test, ANOVA, Regression, etc.) 
                  and configure it with full control over parameters and assumptions.
                </p>
                <p className="text-base text-muted-foreground leading-relaxed">
                  This feature is designed for users who already know which statistical method 
                  they want to use and need detailed, publication-ready output.
                </p>
              </section>

              {/* When to Use */}
              <section 
                id="when-to-use" 
                ref={el => { sectionRefs.current['when-to-use'] = el; }}
                className="scroll-mt-24 mb-16 border-t pt-12"
              >
                <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                  <HelpCircle className="w-7 h-7 text-primary" />
                  When to Use
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-base mb-1">You know which statistical method you need</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        You're already familiar with t-tests, ANOVA, regression, or other statistical methods
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
                        Built-in assumption checks ensure your analysis meets statistical requirements
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Key Features */}
              <section 
                id="key-features" 
                ref={el => { sectionRefs.current['key-features'] = el; }}
                className="scroll-mt-24 mb-16 border-t pt-12"
              >
                <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                  <Info className="w-7 h-7 text-primary" />
                  Key Features
                </h2>
                <div className="space-y-8">
                  {KEY_FEATURES.map((feature, index) => (
                    <div key={index} className="pl-6 border-l-2 border-primary/30">
                      <div className="flex items-start gap-4 mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                          <feature.icon className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-semibold text-xl">{feature.label}</h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed ml-14">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* How It Works: 6-Step Process */}
              <section 
                id="how-it-works" 
                ref={el => { sectionRefs.current['how-it-works'] = el; }}
                className="scroll-mt-24 mb-16 border-t pt-12"
              >
                <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                  <Settings2 className="w-7 h-7 text-primary" />
                  How It Works: 6-Step Process
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Every analysis follows the same structured workflow. This ensures you understand 
                  both <strong className="text-foreground">what the results mean</strong> and 
                  <strong className="text-foreground"> why they occurred</strong>.
                </p>
                
                <div className="space-y-6">
                  {ANALYSIS_STEPS.map((step, index) => (
                    <div key={step.id} className="flex gap-4">
                      {/* Step Number & Connector */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                          {step.id}
                        </div>
                        {index < ANALYSIS_STEPS.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-2 min-h-[40px]"></div>
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 mb-2">
                          <step.icon className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-lg">{step.label}</h3>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-5 bg-primary/5 border-l-4 border-primary rounded">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Note:</strong> This 6-step structure helps beginners 
                    understand statistical concepts while giving experts the detailed output they need.
                  </p>
                </div>
              </section>

              {/* Comparison */}
              <section 
                id="comparison" 
                ref={el => { sectionRefs.current['comparison'] = el; }}
                className="scroll-mt-24 mb-16 border-t pt-12"
              >
                <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                  <FileText className="w-7 h-7 text-primary" />
                  Standard Analysis vs. Other Features
                </h2>
                <div className="space-y-6">
                  <div className="pl-6 border-l-4 border-primary/40">
                    <h3 className="font-semibold text-lg mb-2">vs. Recommendation</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      You manually choose the method instead of relying on AI suggestions. 
                      Best when you already know which test to use.
                    </p>
                  </div>
                  <div className="pl-6 border-l-4 border-primary/40">
                    <h3 className="font-semibold text-lg mb-2">vs. Quick Analysis</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Provides full parameter control and detailed statistical output, 
                      rather than simplified quick results.
                    </p>
                  </div>
                  <div className="pl-6 border-l-4 border-primary/40">
                    <h3 className="font-semibold text-lg mb-2">vs. Advanced Methods</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Follows classical statistical framework with modern user experience, 
                      making it accessible yet powerful.
                    </p>
                  </div>
                </div>
              </section>
                </article>
              </CardContent>
            </Card>
          </div>

          {/* 우측 고정 네비게이션 - 별도 Card */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <Card>
                <CardContent className="p-4">
                  <nav className="space-y-1">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    On This Page
                  </h4>
                  {SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        "block w-full text-left text-sm py-2 px-3 rounded transition-colors",
                        activeSection === section.id
                          ? 'text-primary font-medium bg-primary/10 border-l-2 border-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {section.label}
                    </button>
                  ))}
                  </nav>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

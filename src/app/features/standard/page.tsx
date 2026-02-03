'use client';

import React, { useState, useEffect } from 'react';
import { FeaturePageHeader } from '@/components/feature-page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  FileUp, 
  Zap, 
  FileText, 
  CheckCircle2, 
  BarChart3,
  Brain,
  Download,
  Target,
  Clock,
  Shield,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const features = {
  'methods': { 
    icon: BarChart3, 
    title: '85+ Analysis Methods', 
    description: 'From basic statistics to advanced machine learning—all in one place.',
    image: PlaceHolderImages.find(p => p.id === "dashboard-analytics"),
    details: [
      'Descriptive statistics & frequencies',
      'Hypothesis testing (t-test, ANOVA, chi-square)',
      'Regression & prediction models',
      'Clustering & classification',
      'Time series & forecasting',
    ]
  },
  'interpretation': { 
    icon: Brain, 
    title: 'Clear Explanations', 
    description: 'Understand your results with plain-language explanations, statistical guidance, and built-in glossaries.',
    image: PlaceHolderImages.find(p => p.id === "api-integrations"),
    details: [
      'What the numbers mean in context',
      'Statistical terms explained',
      'Built-in analysis guides',
      'Step-by-step interpretation',
      'Visual explanation aids',
    ]
  },
  'chat': { 
    icon: Sparkles, 
    title: 'AI Chat Support', 
    description: 'Ask questions about your results, statistical concepts, or analysis methods—get instant answers.',
    image: PlaceHolderImages.find(p => p.id === "hero-image"),
    details: [
      'Ask about your specific results',
      'Clarify statistical concepts',
      'Get method recommendations',
      'Troubleshoot data issues',
      'Learn as you analyze',
    ]
  },
  'reports': { 
    icon: FileText, 
    title: 'Professional Reports', 
    description: 'Download publication-ready reports with charts, tables, and insights.',
    image: PlaceHolderImages.find(p => p.id === "market-research-banner"),
    details: [
      'Executive summaries',
      'Detailed methodology',
      'Publication-quality charts',
      'Statistical tables',
      'Export to PDF/Word',
    ]
  },
  'validation': { 
    icon: Shield, 
    title: 'Automatic Validation', 
    description: 'Checks assumptions and data quality before running analysis.',
    image: PlaceHolderImages.find(p => p.id === "empty-state-chart"),
    details: [
      'Normality tests',
      'Homogeneity checks',
      'Outlier detection',
      'Missing data warnings',
      'Sample size validation',
    ]
  },
};

const FeatureCard = ({ 
  feature, 
  featureKey,
  isActive, 
  onMouseEnter, 
  onMouseLeave 
}: { 
  feature: typeof features[keyof typeof features];
  featureKey: string;
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => {
  const Icon = feature.icon;
  
  return (
    <div 
      className={cn(
        "p-5 rounded-lg cursor-pointer transition-all duration-200 border",
        isActive 
          ? "bg-primary/5 border-primary" 
          : "bg-white border-border hover:border-primary/50"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-1">{feature.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
    </div>
  );
};

const steps = [
  {
    number: '1',
    title: 'Upload Your Data',
    description: 'Drag & drop CSV or Excel files—or use our sample data',
    icon: FileUp,
  },
  {
    number: '2',
    title: 'Choose Analysis',
    description: 'Browse 85+ methods or let AI suggest the right one',
    icon: Target,
  },
  {
    number: '3',
    title: 'Get Instant Results',
    description: 'See charts, statistics, and interpretations in seconds',
    icon: Zap,
  },
  {
    number: '4',
    title: 'Download Report',
    description: 'Export professional PDF/Word reports ready to share',
    icon: Download,
  },
];

const categories = [
  {
    icon: BarChart3,
    name: 'Descriptive',
    count: '3 analyses',
    examples: ['Descriptive Statistics', 'Frequency Analysis', 'Variability Analysis'],
  },
  {
    icon: Shield,
    name: 'Assumptions',
    count: '3 analyses',
    examples: ['Normality Test', 'Homogeneity of Variance', 'Outlier Detection'],
  },
  {
    icon: Target,
    name: 'Comparison',
    count: '13 analyses',
    examples: ['T-Tests', 'ANOVA', 'Chi-Square', 'Non-parametric Tests'],
  },
  {
    icon: Brain,
    name: 'Relationship',
    count: '10 analyses',
    examples: ['Correlation', 'Linear Regression', 'Logistic Regression', 'Relative Importance'],
  },
  {
    icon: Sparkles,
    name: 'Predictive',
    count: '7 analyses',
    examples: ['Decision Tree', 'Random Forest', 'Gradient Boosting', 'Survival Analysis'],
  },
  {
    icon: FileText,
    name: 'Structural',
    count: '6 analyses',
    examples: ['Factor Analysis', 'PCA', 'Reliability', 'Mediation & Moderation'],
  },
  {
    icon: CheckCircle2,
    name: 'Clustering',
    count: '5 analyses',
    examples: ['K-Means', 'Hierarchical', 'DBSCAN', 'HDBSCAN'],
  },
  {
    icon: Clock,
    name: 'Time Series',
    count: '9 analyses',
    examples: ['Trend Analysis', 'ARIMA', 'Seasonal Decomposition', 'Exponential Smoothing'],
  },
  {
    icon: Download,
    name: 'Econometrics',
    count: '6 analyses',
    examples: ['Difference-in-Differences', 'Propensity Score Matching', 'Instrumental Variables', 'Regression Discontinuity'],
  },
];

export default function StandardAnalysisFeaturePage() {
  const featureKeys = Object.keys(features);
  const [activeFeature, setActiveFeature] = useState(featureKeys[0]);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (isHovering) return;

    const interval = setInterval(() => {
      setActiveFeature(current => {
        const currentIndex = featureKeys.indexOf(current);
        const nextIndex = (currentIndex + 1) % featureKeys.length;
        return featureKeys[nextIndex];
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isHovering, featureKeys]);

  const currentFeature = features[activeFeature as keyof typeof features];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <FeaturePageHeader title="Standard Analysis" />
      
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="max-w-6xl mx-auto space-y-16">
          
          {/* HERO SECTION */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">
              Professional Statistical Analysis,
              <br />
              <span className="text-primary">Made Simple</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Upload your data and get comprehensive analysis reports with clear explanations, statistical guidance, and AI chat support. Perfect for students, researchers, and business analysts.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>85+ Analysis Methods</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>AI Chat Support</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Built-in Learning Guides</span>
              </div>
            </div>
          </div>

          {/* KEY FEATURES */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Why Choose Standard Analysis?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Powerful statistical tools designed for business users, researchers, and analysts who need results fast.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Feature List */}
              <div className="space-y-3">
                {Object.entries(features).map(([key, feature]) => (
                  <FeatureCard
                    key={key}
                    feature={feature}
                    featureKey={key}
                    isActive={activeFeature === key}
                    onMouseEnter={() => { setActiveFeature(key); setIsHovering(true); }}
                    onMouseLeave={() => setIsHovering(false)}
                  />
                ))}
              </div>

              {/* Feature Showcase - Interactive Demo */}
              <div className="lg:sticky lg:top-8">
                <div className="bg-white rounded-lg border shadow-lg overflow-hidden">
                  {/* Demo Window */}
                  <div className="h-96 relative bg-slate-50">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeFeature}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 flex flex-col"
                      >
                        {/* 85+ Methods Demo */}
                        {activeFeature === 'methods' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Choose Analysis Method</div>
                              <div className="text-xs text-muted-foreground">85+ statistical methods available</div>
                            </div>
                            
                            <div className="flex gap-2 mb-3">
                              <input type="text" placeholder="Search analyses..." className="flex-1 px-3 py-1.5 text-xs border rounded" />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2">
                              {[
                                { category: 'Descriptive', methods: ['Descriptive Statistics', 'Frequency Analysis'], count: 3 },
                                { category: 'Comparison', methods: ['T-Test', 'ANOVA', 'Chi-Square'], count: 13 },
                                { category: 'Relationship', methods: ['Correlation', 'Linear Regression'], count: 10 },
                                { category: 'Predictive', methods: ['Decision Tree', 'Random Forest'], count: 7 },
                                { category: 'Time Series', methods: ['ARIMA', 'Seasonal Decomposition'], count: 9 },
                              ].map((cat, i) => (
                                <motion.div
                                  key={cat.category}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.08 }}
                                  className="border rounded-lg overflow-hidden bg-white"
                                >
                                  <div className="px-3 py-2 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100">
                                    <span className="text-xs font-semibold">{cat.category}</span>
                                    <span className="text-xs text-muted-foreground">{cat.count} methods</span>
                                  </div>
                                  <div className="px-3 py-2 space-y-1">
                                    {cat.methods.map((method) => (
                                      <div key={method} className="text-xs py-1 px-2 hover:bg-primary/5 rounded cursor-pointer">
                                        {method}
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Clear Explanations Demo */}
                        {activeFeature === 'interpretation' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Analysis Results</div>
                              <div className="text-xs text-muted-foreground">With plain-language explanations</div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3">
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="text-xs font-semibold mb-2">📊 Key Findings</div>
                                <p className="text-xs text-slate-700 leading-relaxed">
                                  The analysis shows a <strong>statistically significant difference</strong> between groups (p = 0.023). 
                                  This means there's only a 2.3% chance this occurred by random chance.
                                </p>
                              </div>

                              <div className="p-3 bg-white border rounded-lg">
                                <div className="text-xs font-semibold mb-2">📖 Statistical Terms</div>
                                <div className="space-y-2">
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-medium min-w-16">p-value:</span>
                                    <span className="text-xs text-muted-foreground">Probability of result by chance</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-medium min-w-16">t-statistic:</span>
                                    <span className="text-xs text-muted-foreground">Test statistic value = 2.34</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-medium min-w-16">Cohen's d:</span>
                                    <span className="text-xs text-muted-foreground">Effect size (0.67 = medium)</span>
                                  </div>
                                </div>
                              </div>

                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="text-xs font-semibold mb-2">✅ Interpretation</div>
                                <p className="text-xs text-slate-700">
                                  Your results are statistically significant with a medium-to-large effect size. 
                                  This provides strong evidence for your hypothesis.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* AI Chat Demo */}
                        {activeFeature === 'chat' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3 flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold">AI Assistant</div>
                                <div className="text-xs text-green-600 flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                                  Online
                                </div>
                              </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-2 justify-end"
                              >
                                <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg rounded-br-sm max-w-[80%]">
                                  <p className="text-xs">What does p-value of 0.023 mean?</p>
                                </div>
                              </motion.div>

                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex gap-2"
                              >
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Sparkles className="w-3 h-3 text-primary" />
                                </div>
                                <div className="bg-white border px-3 py-2 rounded-lg rounded-bl-sm max-w-[80%]">
                                  <p className="text-xs">
                                    The p-value of 0.023 indicates <strong>statistical significance</strong> at α = 0.05. 
                                    There's only a 2.3% probability that your results occurred by random chance.
                                  </p>
                                </div>
                              </motion.div>

                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="flex gap-2 justify-end"
                              >
                                <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg rounded-br-sm max-w-[80%]">
                                  <p className="text-xs">How do I report this in APA format?</p>
                                </div>
                              </motion.div>

                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.9 }}
                                className="flex gap-2"
                              >
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Sparkles className="w-3 h-3 text-primary" />
                                </div>
                                <div className="bg-white border px-3 py-2 rounded-lg rounded-bl-sm max-w-[80%]">
                                  <p className="text-xs font-mono">
                                    t(48) = 2.34, p = .023, d = 0.67
                                  </p>
                                </div>
                              </motion.div>
                            </div>

                            <div className="flex items-center gap-2 p-2 bg-white border rounded-lg">
                              <input 
                                type="text" 
                                placeholder="Ask about your results..." 
                                className="flex-1 text-xs outline-none"
                                disabled
                              />
                              <button className="p-1.5 bg-primary rounded text-primary-foreground">
                                <Sparkles className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Professional Reports Demo */}
                        {activeFeature === 'reports' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Analysis Report</div>
                              <div className="text-xs text-muted-foreground">Publication-ready output</div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3">
                              <div className="border rounded-lg bg-white overflow-hidden">
                                <div className="px-3 py-2 bg-slate-50 border-b">
                                  <div className="text-xs font-semibold">1. Executive Summary</div>
                                </div>
                                <div className="px-3 py-2 text-xs text-muted-foreground">
                                  Key findings and recommendations in plain language...
                                </div>
                              </div>

                              <div className="border rounded-lg bg-white overflow-hidden">
                                <div className="px-3 py-2 bg-slate-50 border-b">
                                  <div className="text-xs font-semibold">2. Methodology</div>
                                </div>
                                <div className="px-3 py-2 space-y-2">
                                  <div className="text-xs">
                                    <span className="font-medium">Method:</span>
                                    <span className="text-muted-foreground ml-1">Independent Samples T-Test</span>
                                  </div>
                                  <div className="text-xs">
                                    <span className="font-medium">Assumptions:</span>
                                    <span className="text-muted-foreground ml-1">✓ Normality ✓ Homogeneity</span>
                                  </div>
                                </div>
                              </div>

                              <div className="border rounded-lg bg-white overflow-hidden">
                                <div className="px-3 py-2 bg-slate-50 border-b">
                                  <div className="text-xs font-semibold">3. Results</div>
                                </div>
                                <div className="px-3 py-2">
                                  <div className="h-20 bg-slate-100 rounded flex items-center justify-center text-xs text-muted-foreground">
                                    📊 Chart: Group Comparison
                                  </div>
                                  <div className="mt-2 text-xs">
                                    <table className="w-full">
                                      <thead className="border-b">
                                        <tr className="text-left">
                                          <th className="py-1">Statistic</th>
                                          <th className="py-1 text-right">Value</th>
                                        </tr>
                                      </thead>
                                      <tbody className="text-muted-foreground">
                                        <tr>
                                          <td className="py-1">t-value</td>
                                          <td className="py-1 text-right font-mono">2.34</td>
                                        </tr>
                                        <tr>
                                          <td className="py-1">p-value</td>
                                          <td className="py-1 text-right font-mono">0.023</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex gap-2">
                              <button className="flex-1 py-2 bg-white border rounded text-xs flex items-center justify-center gap-1">
                                <Download className="w-3 h-3" />
                                PDF
                              </button>
                              <button className="flex-1 py-2 bg-white border rounded text-xs flex items-center justify-center gap-1">
                                <Download className="w-3 h-3" />
                                Word
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Validation Demo */}
                        {activeFeature === 'validation' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Assumption Checks</div>
                              <div className="text-xs text-muted-foreground">Automatic validation before analysis</div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2">
                              {[
                                { test: 'Normality Test', status: 'pass', detail: 'Shapiro-Wilk p = 0.12' },
                                { test: 'Homogeneity of Variance', status: 'pass', detail: "Levene's test p = 0.08" },
                                { test: 'Outlier Detection', status: 'fail', detail: '2 outliers detected' },
                                { test: 'Sample Size', status: 'pass', detail: 'n = 50 (adequate)' },
                                { test: 'Missing Data', status: 'pass', detail: 'No missing values' },
                              ].map((item, i) => (
                                <motion.div
                                  key={item.test}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                  className={cn(
                                    "p-3 rounded-lg border flex items-start gap-3",
                                    item.status === 'pass' 
                                      ? "bg-blue-50 border-blue-200" 
                                      : "bg-red-50 border-red-200"
                                  )}
                                >
                                  <div className={cn(
                                    "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                                    item.status === 'pass' ? "bg-blue-500" : "bg-red-500"
                                  )}>
                                    {item.status === 'pass' ? (
                                      <CheckCircle2 className="w-3 h-3 text-white" />
                                    ) : (
                                      <X className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold">{item.test}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{item.detail}</div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>

                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-blue-700">
                                  All critical assumptions met. Safe to proceed with analysis.
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Feature Details */}
                  <div className="p-6 border-t bg-slate-50">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeFeature}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <currentFeature.icon className="w-5 h-5 text-primary" />
                          {currentFeature.title}
                        </h3>
                        <ul className="space-y-2">
                          {currentFeature.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From data upload to professional report in 4 simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 relative">
                        <step.icon className="w-7 h-7 text-primary" />
                        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {step.number}
                        </div>
                      </div>
                      <h3 className="font-semibold mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Average time: Less than 2 minutes
              </div>
            </div>
          </section>

          {/* ANALYSIS CATEGORIES */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Analysis Categories</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                85+ statistical methods organized by purpose—from basic statistics to advanced modeling
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                        <category.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">{category.count}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {category.examples.map((example, exIdx) => (
                        <div key={exIdx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1 h-1 rounded-full bg-primary"></div>
                          <span>{example}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* REPORT STRUCTURE */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">What You Get in Every Report</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Comprehensive, professional analysis reports with clear structure
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">1</span>
                    </div>
                    <h3 className="font-semibold text-lg">Executive Summary</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Plain-language overview of your findings and what they mean for your business or research.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Key findings at a glance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Business implications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Actionable recommendations</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">2</span>
                    </div>
                    <h3 className="font-semibold text-lg">Methodology & Evidence</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Transparent explanation of analysis approach and statistical reasoning behind conclusions.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Why this method was chosen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Assumption checks performed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Interpretation guidance</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">3</span>
                    </div>
                    <h3 className="font-semibold text-lg">Statistical Results</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Detailed tables, charts, and statistical outputs for thorough analysis and documentation.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Publication-quality charts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Detailed statistical tables</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Exact p-values & confidence intervals</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-6">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <FileText className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Professional Reports</h3>
                      <p className="text-sm text-muted-foreground">
                        Download complete analysis reports as PDF or Word, ready to share with stakeholders or include in publications.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Brain className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Python Code</h3>
                      <p className="text-sm text-muted-foreground">
                        Get reproducible Python code for your analysis—perfect for coursework submissions and further customization.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* CTA SECTION */}
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Transform Your Data?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of students, researchers, and analysts who trust Standard Analysis for their statistical needs.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <Button size="lg" className="gap-2">
                  <Sparkles className="w-5 h-5" />
                  Start Free Analysis
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <FileText className="w-5 h-5" />
                  Explore All Methods
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Free sample datasets
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Cancel anytime
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { FeaturePageHeader } from '@/components/feature-page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  CheckCircle2, 
  TrendingUp,
  Users,
  Package,
  DollarSign,
  Cog,
  Briefcase,
  Target,
  FileText,
  BookOpen,
  Zap,
  Clock,
  BarChart3,
  ShieldCheck,
  Download,
  Brain,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const features = {
  'business-focused': { 
    icon: Target, 
    title: 'Business-Focused Analysis', 
    description: 'Pre-configured analyses designed for real business problems—no statistics jargon.',
    image: PlaceHolderImages.find(p => p.id === "dashboard-analytics"),
    details: [
      'Plain-language explanations',
      'Business metrics & KPIs',
      'Industry-specific insights',
      'Actionable recommendations',
      'Executive summaries',
    ]
  },
  'domains': { 
    icon: Briefcase, 
    title: '6 Business Domains', 
    description: 'Organized by business function—find the right analysis for your role and challenge.',
    image: PlaceHolderImages.find(p => p.id === "api-integrations"),
    details: [
      'Marketing & Sales',
      'Customer & Engagement',
      'Operations & Logistics',
      'Finance & Risk',
      'Quality & Manufacturing',
      'HR & Organization',
    ]
  },
  'methods': { 
    icon: BarChart3, 
    title: '40+ Analysis Methods', 
    description: 'From customer lifetime value to inventory optimization—comprehensive business toolkit.',
    image: PlaceHolderImages.find(p => p.id === "hero-image"),
    details: [
      'Pricing & demand analysis',
      'Churn prediction',
      'Resource optimization',
      'Risk assessment',
      'Process control',
      'Workforce analytics',
    ]
  },
  'validation': { 
    icon: ShieldCheck, 
    title: 'Guided Configuration', 
    description: 'Step-by-step setup with validation—ensures your data and settings are correct.',
    image: PlaceHolderImages.find(p => p.id === "market-research-banner"),
    details: [
      'Data requirement checks',
      'Automatic validation',
      'Configuration guidance',
      'Error prevention',
      'Best practice recommendations',
    ]
  },
  'guides': { 
    icon: BookOpen, 
    title: 'Built-in Learning', 
    description: 'Every analysis includes educational guides—understand methodology and interpretation.',
    image: PlaceHolderImages.find(p => p.id === "empty-state-chart"),
    details: [
      'What the analysis does',
      'When to use it',
      'How to interpret results',
      'Assumptions & limitations',
      'Implementation tips',
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
    title: 'Choose Your Domain',
    description: 'Select the business area matching your challenge',
    icon: Target,
  },
  {
    number: '2',
    title: 'Pick Analysis Method',
    description: 'Browse use cases and select the right analysis',
    icon: BarChart3,
  },
  {
    number: '3',
    title: 'Configure & Validate',
    description: 'Map your data with guided validation',
    icon: ShieldCheck,
  },
  {
    number: '4',
    title: 'Get Insights',
    description: 'Review results with business recommendations',
    icon: Sparkles,
  },
  {
    number: '5',
    title: 'Export Report',
    description: 'Download professional analysis report',
    icon: Download,
  },
];

const domains = [
  {
    icon: TrendingUp,
    name: 'Marketing & Sales',
    count: '8 analyses',
    examples: ['CLV Forecasting', 'Marketing Mix Modeling', 'Pricing Optimization', 'Price Elasticity'],
  },
  {
    icon: Users,
    name: 'Customer & Engagement',
    count: '7 analyses',
    examples: ['Churn Prediction', 'Customer Segmentation', 'Cohort Analysis', 'RFM Analysis'],
  },
  {
    icon: Package,
    name: 'Operations & Logistics',
    count: '6 analyses',
    examples: ['Inventory Optimization', 'Vehicle Routing', 'Job Shop Scheduling', 'Knapsack Problem'],
  },
  {
    icon: DollarSign,
    name: 'Finance & Risk',
    count: '6 analyses',
    examples: ['Portfolio Optimization', 'Credit Risk Scoring', 'Value at Risk', 'Monte Carlo Simulation'],
  },
  {
    icon: Cog,
    name: 'Quality & Manufacturing',
    count: '7 analyses',
    examples: ['SPC Control Charts', 'Process Capability', 'Gage R&R', 'Design of Experiments'],
  },
  {
    icon: Briefcase,
    name: 'HR & Organization',
    count: '6 analyses',
    examples: ['Attrition Modeling', 'Compensation Analysis', 'Engagement Survey', 'Workforce Planning'],
  },
];

export default function StrategicDecisionFeaturePage() {
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
      <FeaturePageHeader title="Strategic Decision" />
      
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="max-w-6xl mx-auto space-y-16">
          
          {/* HERO SECTION */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">
              Business Decisions,
              <br />
              <span className="text-primary">Backed by Data</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Pre-configured analyses for common business challenges. Upload your data, get actionable insights with clear explanations—no statistics background required.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>40+ Business Analyses</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>6 Business Domains</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Built-in Guides</span>
              </div>
            </div>
          </div>

          {/* KEY FEATURES */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Why Strategic Decision?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Business-focused analytics designed for managers, analysts, and decision-makers
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
                        {/* Business-Focused Analysis Demo */}
                        {activeFeature === 'business-focused' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Business Question</div>
                              <div className="text-xs text-muted-foreground">Choose your challenge</div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-2">
                              {[
                                { 
                                  question: 'Which customers are likely to churn?',
                                  domain: 'Customer Analytics',
                                  method: 'Churn Prediction',
                                  icon: Users
                                },
                                { 
                                  question: 'How can we optimize inventory levels?',
                                  domain: 'Operations',
                                  method: 'Inventory Optimization',
                                  icon: Package
                                },
                                { 
                                  question: 'What drives customer lifetime value?',
                                  domain: 'Marketing',
                                  method: 'CLV Forecasting',
                                  icon: TrendingUp
                                },
                                { 
                                  question: 'How to balance portfolio risk vs return?',
                                  domain: 'Finance',
                                  method: 'Portfolio Optimization',
                                  icon: DollarSign
                                },
                              ].map((item, i) => (
                                <motion.div
                                  key={item.question}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                  className="p-3 bg-white border rounded-lg hover:border-primary cursor-pointer transition-all"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <item.icon className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium mb-1">{item.question}</div>
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                          {item.domain}
                                        </span>
                                        <span className="text-xs text-muted-foreground">→ {item.method}</span>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>

                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="text-xs text-blue-700">
                                💡 No statistics knowledge needed—just select your business problem
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 6 Domains Demo */}
                        {activeFeature === 'domains' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Business Domains</div>
                              <div className="text-xs text-muted-foreground">Organized by function</div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2">
                              {[
                                { name: 'Marketing & Sales', icon: TrendingUp, count: 8, color: 'blue' },
                                { name: 'Customer & Engagement', icon: Users, count: 7, color: 'purple' },
                                { name: 'Operations & Logistics', icon: Package, count: 6, color: 'green' },
                                { name: 'Finance & Risk', icon: DollarSign, count: 6, color: 'emerald' },
                                { name: 'Quality & Manufacturing', icon: Cog, count: 7, color: 'orange' },
                                { name: 'HR & Organization', icon: Briefcase, count: 6, color: 'pink' },
                              ].map((domain, i) => (
                                <motion.div
                                  key={domain.name}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.08 }}
                                  className="p-3 bg-white border rounded-lg hover:border-primary cursor-pointer transition-all"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                      domain.color === 'blue' && "bg-blue-100",
                                      domain.color === 'purple' && "bg-purple-100",
                                      domain.color === 'green' && "bg-green-100",
                                      domain.color === 'emerald' && "bg-emerald-100",
                                      domain.color === 'orange' && "bg-orange-100",
                                      domain.color === 'pink' && "bg-pink-100"
                                    )}>
                                      <domain.icon className={cn(
                                        "w-5 h-5",
                                        domain.color === 'blue' && "text-blue-600",
                                        domain.color === 'purple' && "text-purple-600",
                                        domain.color === 'green' && "text-green-600",
                                        domain.color === 'emerald' && "text-emerald-600",
                                        domain.color === 'orange' && "text-orange-600",
                                        domain.color === 'pink' && "text-pink-600"
                                      )} />
                                    </div>
                                    <div className="flex-1">
                                      <div className="text-sm font-medium">{domain.name}</div>
                                      <div className="text-xs text-muted-foreground">{domain.count} analyses</div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 40+ Methods Demo */}
                        {activeFeature === 'methods' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Marketing & Sales</div>
                              <div className="text-xs text-muted-foreground">8 analysis methods</div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2">
                              {[
                                'CLV Forecasting',
                                'Marketing Mix Modeling',
                                'Pricing Optimization',
                                'Price Elasticity',
                                'Market Basket Analysis',
                                'RFM Analysis',
                                'Sales Forecasting',
                                'Campaign ROI',
                              ].map((method, i) => (
                                <motion.div
                                  key={method}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.06 }}
                                  className="p-3 bg-white border rounded-lg hover:bg-primary/5 cursor-pointer transition-all"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
                                    <div className="text-sm">{method}</div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>

                            <div className="mt-3 text-center">
                              <div className="text-2xl font-bold text-primary">40+</div>
                              <div className="text-xs text-muted-foreground">Total analysis methods</div>
                            </div>
                          </div>
                        )}

                        {/* Guided Configuration Demo */}
                        {activeFeature === 'validation' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Configure Analysis</div>
                              <div className="text-xs text-muted-foreground">Step-by-step setup</div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3">
                              <div className="space-y-2">
                                <div className="text-xs font-medium">1. Select Target Variable</div>
                                <select className="w-full px-3 py-2 text-sm border rounded bg-white">
                                  <option>Churn (Yes/No)</option>
                                </select>
                                <div className="flex items-center gap-2 text-xs text-green-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Binary variable detected
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="text-xs font-medium">2. Select Features</div>
                                <div className="space-y-1">
                                  {['Age', 'Tenure', 'Monthly_Charge', 'Contract_Type'].map((feature) => (
                                    <label key={feature} className="flex items-center gap-2 p-2 bg-white border rounded text-xs hover:bg-slate-50 cursor-pointer">
                                      <input type="checkbox" checked readOnly className="rounded" />
                                      <span>{feature}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="text-xs font-medium">3. Validation</div>
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                                  <div className="flex items-center gap-2 text-xs">
                                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                    <span className="text-blue-700">Data requirements met</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                    <span className="text-blue-700">No missing values</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                    <span className="text-blue-700">Sample size: 1,234 rows</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <button className="w-full py-2 bg-primary text-primary-foreground rounded text-sm font-medium">
                              Run Analysis
                            </button>
                          </div>
                        )}

                        {/* Built-in Learning Demo */}
                        {activeFeature === 'guides' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Churn Prediction Guide</div>
                              <div className="text-xs text-muted-foreground">Learn as you analyze</div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3">
                              <div className="p-3 bg-white border rounded-lg">
                                <div className="text-xs font-semibold mb-2">📘 What it does</div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Predicts which customers are likely to stop using your service based on their behavior and characteristics.
                                </p>
                              </div>

                              <div className="p-3 bg-white border rounded-lg">
                                <div className="text-xs font-semibold mb-2">⏰ When to use it</div>
                                <ul className="space-y-1 text-xs text-muted-foreground">
                                  <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    <span>Customer retention campaigns</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    <span>Resource allocation planning</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    <span>Identifying at-risk segments</span>
                                  </li>
                                </ul>
                              </div>

                              <div className="p-3 bg-white border rounded-lg">
                                <div className="text-xs font-semibold mb-2">📊 How to interpret</div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Focus on customers with high churn probability (&gt;70%). The model also shows which factors drive churn.
                                </p>
                              </div>

                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="text-xs font-semibold mb-1">💡 Business Tip</div>
                                <p className="text-xs text-blue-700">
                                  Combine with customer lifetime value to prioritize high-value at-risk customers.
                                </p>
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
                From business question to actionable insight in 5 guided steps
              </p>
            </div>

            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                      <h3 className="font-semibold mb-2 text-sm">{step.title}</h3>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Average time: 10-15 minutes per analysis
              </div>
            </div>
          </section>

          {/* BUSINESS DOMAINS */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Business Domains</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                40+ analyses organized by business function—find solutions for your specific challenges
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {domains.map((domain, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                        <domain.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1">{domain.name}</h3>
                        <p className="text-sm text-muted-foreground">{domain.count}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {domain.examples.map((example, exIdx) => (
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

          {/* WHAT YOU GET */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">What You Get</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Comprehensive analysis reports designed for business communication
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">1</span>
                    </div>
                    <h3 className="font-semibold text-lg">Business Summary</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Plain-language overview of findings and what they mean for your business decisions.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Key insights</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Recommendations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Business impact</span>
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
                    <h3 className="font-semibold text-lg">Methodology Guide</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Understand how the analysis works and why results are trustworthy.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>What it calculates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Assumptions explained</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Interpretation tips</span>
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
                    <h3 className="font-semibold text-lg">Detailed Results</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Charts, tables, and metrics you need for thorough analysis and reporting.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Interactive visualizations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Detailed metrics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Export-ready format</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <FileText className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Professional Export</h3>
                      <p className="text-sm text-muted-foreground">
                        Download complete reports as PDF or Word documents, ready to share with stakeholders or include in presentations.
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
                Ready to Make Data-Driven Decisions?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join businesses using Strategic Decision to solve real challenges with data.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <Button size="lg" className="gap-2">
                  <Sparkles className="w-5 h-5" />
                  Explore Analyses
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <BookOpen className="w-5 h-5" />
                  View Use Cases
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  No technical background needed
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Guided setup & validation
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Professional reports
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}

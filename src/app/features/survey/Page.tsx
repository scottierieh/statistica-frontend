'use client';

import React, { useState, useEffect } from 'react';
import { FeaturePageHeader } from '@/components/feature-page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  CheckCircle2, 
  ClipboardList,
  BarChart3,
  Users,
  Share2,
  QrCode,
  Palette,
  Eye,
  Filter,
  Scale,
  FileDown,
  BookOpen,
  Zap,
  Clock,
  ShieldCheck,
  Brain,
  ChevronRight,
  PenTool,
  MousePointerClick,
  LineChart,
  Target,
  ListChecks,
  MessageSquare,
  Star,
  Grid3x3,
  ArrowUpDown,
  Gauge,
  SlidersHorizontal,
  Link2,
  Download,
  Calculator,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const features = {
  'question-types': { 
    icon: ListChecks, 
    title: '14+ Question Types', 
    description: 'From simple multiple choice to NPS, Likert scales, matrix questions, and more—build any survey you need.',
    details: [
      'Single & Multiple Choice',
      'Likert Scale & Rating',
      'NPS (Net Promoter Score)',
      'Matrix & Semantic Differential',
      'Best-Worst Scaling',
      'Open Text & Number Input',
    ]
  },
  'design': { 
    icon: Palette, 
    title: 'Custom Design & Branding', 
    description: 'Full control over colors, fonts, spacing, and branding—make surveys match your brand identity.',
    details: [
      'Custom color themes',
      'Font & spacing control',
      'Logo & image upload',
      'Start page customization',
      'Preview on desktop, tablet, mobile',
      'Professional appearance',
    ]
  },
  'distribution': { 
    icon: Share2, 
    title: 'Easy Distribution', 
    description: 'Share via link or QR code with activation scheduling—reach respondents anywhere, anytime.',
    details: [
      'Shareable URL link',
      'Auto-generated QR code',
      'One-click link copy',
      'Date-based activation',
      'Start & end date scheduling',
      'Mobile-optimized experience',
    ]
  },
  'analysis': { 
    icon: BarChart3, 
    title: 'Real-time Analysis', 
    description: 'Instant visualization of results with filtering, weighting, and multiple chart types.',
    details: [
      'Bar, Pie & Treemap charts',
      'NPS score calculation',
      'Matrix heatmaps',
      'Response filtering',
      'Data weighting',
      'Export to Excel, CSV, JSON',
    ]
  },
  'statistica': { 
    icon: Calculator, 
    title: 'Statistica Integration', 
    description: 'One-click transfer to Statistica for advanced statistical analysis—t-tests, ANOVA, regression, and more.',
    details: [
      'Direct data transfer',
      'No manual export needed',
      '80+ statistical analyses',
      'AI-powered interpretation',
      'Publication-ready output',
      'Seamless workflow',
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
    title: 'Create Survey',
    description: 'Choose question types and build your survey with drag-and-drop ease',
    icon: PenTool,
  },
  {
    number: '2',
    title: 'Design & Brand',
    description: 'Customize colors, fonts, and add your logo for a professional look',
    icon: Palette,
  },
  {
    number: '3',
    title: 'Share & Collect',
    description: 'Distribute via link or QR code and schedule activation dates',
    icon: Share2,
  },
  {
    number: '4',
    title: 'Analyze Results',
    description: 'View real-time charts, filter responses, and apply weights',
    icon: BarChart3,
  },
  {
    number: '5',
    title: 'Deep Dive',
    description: 'Transfer to Statistica for advanced statistical analysis',
    icon: Brain,
  },
];

const questionTypes = [
  {
    icon: MousePointerClick,
    name: 'Choice Questions',
    count: '3 types',
    examples: ['Single Selection', 'Multiple Selection', 'Dropdown'],
  },
  {
    icon: SlidersHorizontal,
    name: 'Scale Questions',
    count: '4 types',
    examples: ['Likert Scale', 'Rating', 'NPS', 'Semantic Differential'],
  },
  {
    icon: Grid3x3,
    name: 'Advanced Questions',
    count: '3 types',
    examples: ['Matrix', 'Best-Worst Scaling', 'Ranking'],
  },
  {
    icon: MessageSquare,
    name: 'Open-Ended',
    count: '2 types',
    examples: ['Text Response', 'Number Input'],
  },
  {
    icon: Layers,
    name: 'Logic & Flow',
    count: '2 features',
    examples: ['Skip Logic', 'Display Logic'],
  },
  {
    icon: Eye,
    name: 'Content',
    count: '1 type',
    examples: ['Description Block', 'Image Support'],
  },
];

export default function SurveyFeaturePage() {
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
      <FeaturePageHeader title="Survey" />
      
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="max-w-6xl mx-auto space-y-16">
          
          {/* HERO SECTION */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">
              Create, Distribute &
              <br />
              <span className="text-primary">Analyze Surveys</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Build professional surveys with 14+ question types, share via link or QR code, and get instant analysis with beautiful charts—all connected to Statistica for deeper insights.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>14+ Question Types</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>QR Code & Link Sharing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Real-time Analysis</span>
              </div>
            </div>
          </div>

          {/* KEY FEATURES */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Why Choose Our Survey Tool?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                End-to-end survey platform from creation to advanced statistical analysis
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

              {/* Feature Showcase */}
              <div className="lg:sticky lg:top-8">
                <div className="bg-white rounded-lg border shadow-lg overflow-hidden">
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
                        {/* Question Types Demo */}
                        {activeFeature === 'question-types' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Question Types</div>
                              <div className="text-xs text-muted-foreground">Choose from 14+ types</div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2">
                              {[
                                { name: 'Single Selection', icon: MousePointerClick, desc: 'One answer from options' },
                                { name: 'Multiple Selection', icon: ListChecks, desc: 'Select multiple answers' },
                                { name: 'Likert Scale', icon: SlidersHorizontal, desc: '5 or 7 point scale' },
                                { name: 'NPS', icon: Gauge, desc: '0-10 recommendation score' },
                                { name: 'Matrix', icon: Grid3x3, desc: 'Grid of rows × columns' },
                                { name: 'Best-Worst', icon: ArrowUpDown, desc: 'Pick best and worst' },
                              ].map((item, i) => (
                                <motion.div
                                  key={item.name}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.08 }}
                                  className="p-3 bg-white border rounded-lg hover:border-primary cursor-pointer transition-all"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <item.icon className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="text-xs font-medium">{item.name}</div>
                                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Design Demo */}
                        {activeFeature === 'design' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Customize Design</div>
                              <div className="text-xs text-muted-foreground">Match your brand</div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3">
                              <div className="space-y-2">
                                <div className="text-xs font-medium">Primary Color</div>
                                <div className="flex gap-2">
                                  {['#3C5462', '#2563EB', '#DC2626', '#059669', '#7C3AED', '#EA580C'].map(color => (
                                    <div key={color} className="w-8 h-8 rounded-full border-2 border-white shadow cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-xs font-medium">Font</div>
                                <div className="space-y-1">
                                  {['Default', 'Serif', 'Mono', 'Rounded'].map(font => (
                                    <div key={font} className="p-2 bg-white border rounded text-xs hover:bg-slate-50 cursor-pointer">{font}</div>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-xs font-medium">Preview</div>
                                <div className="flex gap-2">
                                  {['Desktop', 'Tablet', 'Mobile'].map(device => (
                                    <div key={device} className="flex-1 p-2 bg-white border rounded text-xs text-center hover:bg-primary/5 cursor-pointer">{device}</div>
                                  ))}
                                </div>
                              </div>
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="text-xs text-blue-700">
                                  🎨 Real-time preview updates as you customize
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Distribution Demo */}
                        {activeFeature === 'distribution' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Share Survey</div>
                              <div className="text-xs text-muted-foreground">Multiple distribution channels</div>
                            </div>
                            <div className="flex-1 space-y-4">
                              <div className="p-3 bg-white border rounded-lg">
                                <div className="text-xs font-medium mb-2 flex items-center gap-2">
                                  <Link2 className="w-3 h-3" /> Shareable Link
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 p-2 bg-slate-100 rounded text-xs truncate">https://your-survey.app/s/abc123</div>
                                  <div className="px-3 py-2 bg-primary text-primary-foreground text-xs rounded cursor-pointer">Copy</div>
                                </div>
                              </div>
                              <div className="p-3 bg-white border rounded-lg">
                                <div className="text-xs font-medium mb-2 flex items-center gap-2">
                                  <QrCode className="w-3 h-3" /> QR Code
                                </div>
                                <div className="flex justify-center p-4">
                                  <div className="w-32 h-32 bg-slate-200 rounded flex items-center justify-center">
                                    <QrCode className="w-16 h-16 text-slate-400" />
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-xs rounded cursor-pointer hover:bg-slate-200">
                                    <Download className="w-3 h-3" /> Download QR
                                  </div>
                                </div>
                              </div>
                              <div className="p-3 bg-white border rounded-lg">
                                <div className="text-xs font-medium mb-2 flex items-center gap-2">
                                  <Clock className="w-3 h-3" /> Activation Period
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Feb 15</span>
                                  <span>→</span>
                                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded">Mar 15</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Analysis Demo */}
                        {activeFeature === 'analysis' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Real-time Analysis</div>
                              <div className="text-xs text-muted-foreground">Instant insights from responses</div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3">
                              <div className="grid grid-cols-3 gap-2">
                                <div className="p-2 bg-white border rounded text-center">
                                  <div className="text-lg font-bold text-primary">156</div>
                                  <div className="text-xs text-muted-foreground">Responses</div>
                                </div>
                                <div className="p-2 bg-white border rounded text-center">
                                  <div className="text-lg font-bold text-green-600">72</div>
                                  <div className="text-xs text-muted-foreground">NPS Score</div>
                                </div>
                                <div className="p-2 bg-white border rounded text-center">
                                  <div className="text-lg font-bold text-blue-600">4.2</div>
                                  <div className="text-xs text-muted-foreground">Avg Rating</div>
                                </div>
                              </div>
                              <div className="p-3 bg-white border rounded-lg">
                                <div className="text-xs font-medium mb-2">Response Distribution</div>
                                <div className="space-y-1.5">
                                  {[
                                    { label: 'Very Satisfied', pct: 45, color: 'bg-green-500' },
                                    { label: 'Satisfied', pct: 30, color: 'bg-blue-500' },
                                    { label: 'Neutral', pct: 15, color: 'bg-yellow-500' },
                                    { label: 'Dissatisfied', pct: 7, color: 'bg-orange-500' },
                                    { label: 'Very Dissatisfied', pct: 3, color: 'bg-red-500' },
                                  ].map(item => (
                                    <div key={item.label} className="flex items-center gap-2">
                                      <span className="text-xs w-28 truncate">{item.label}</span>
                                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${item.pct}%` }}
                                          transition={{ delay: 0.3, duration: 0.6 }}
                                          className={cn("h-full rounded-full", item.color)}
                                        />
                                      </div>
                                      <span className="text-xs font-mono w-8 text-right">{item.pct}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <div className="flex-1 p-2 bg-white border rounded text-xs text-center hover:bg-primary/5 cursor-pointer flex items-center justify-center gap-1">
                                  <Filter className="w-3 h-3" /> Filter
                                </div>
                                <div className="flex-1 p-2 bg-white border rounded text-xs text-center hover:bg-primary/5 cursor-pointer flex items-center justify-center gap-1">
                                  <Scale className="w-3 h-3" /> Weight
                                </div>
                                <div className="flex-1 p-2 bg-white border rounded text-xs text-center hover:bg-primary/5 cursor-pointer flex items-center justify-center gap-1">
                                  <FileDown className="w-3 h-3" /> Export
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Statistica Integration Demo */}
                        {activeFeature === 'statistica' && (
                          <div className="h-full flex flex-col p-4">
                            <div className="mb-3">
                              <div className="text-sm font-semibold">Statistica Integration</div>
                              <div className="text-xs text-muted-foreground">Advanced analysis in one click</div>
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <ClipboardList className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-xs font-medium">Survey Results</div>
                                  <div className="text-xs text-muted-foreground">156 responses collected</div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </div>

                              <div className="flex justify-center py-2">
                                <motion.div
                                  animate={{ y: [0, 4, 0] }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
                                >
                                  <Zap className="w-4 h-4 text-primary-foreground" />
                                </motion.div>
                              </div>

                              <div className="flex items-center gap-3 p-3 bg-white border-2 border-primary rounded-lg">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Calculator className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-xs font-medium">Statistica</div>
                                  <div className="text-xs text-muted-foreground">80+ statistical analyses</div>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                {['T-Test', 'ANOVA', 'Regression', 'Factor Analysis', 'Clustering'].map((analysis, i) => (
                                  <motion.div
                                    key={analysis}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + i * 0.1 }}
                                    className="flex items-center gap-2 p-2 bg-slate-50 rounded text-xs"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    <span>{analysis}</span>
                                  </motion.div>
                                ))}
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
                From survey creation to statistical insight in 5 simple steps
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
                Create a survey in under 5 minutes
              </div>
            </div>
          </section>

          {/* QUESTION TYPES */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Question Types</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                14+ question types to capture every kind of feedback and data you need
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {questionTypes.map((qType, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                        <qType.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1">{qType.name}</h3>
                        <p className="text-sm text-muted-foreground">{qType.count}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {qType.examples.map((example, exIdx) => (
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
                Complete survey lifecycle from creation to advanced analysis
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">1</span>
                    </div>
                    <h3 className="font-semibold text-lg">Professional Surveys</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Beautiful, branded surveys that look professional on any device.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Custom branding & colors</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Mobile responsive</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Skip & display logic</span>
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
                    <h3 className="font-semibold text-lg">Visual Analytics</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Real-time charts and insights as responses come in.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Multiple chart types</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Filtering & weighting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Export to Excel/CSV/JSON</span>
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
                    <h3 className="font-semibold text-lg">Statistical Power</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    One-click transfer to Statistica for deep statistical analysis.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>80+ statistical methods</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>AI interpretation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Seamless data transfer</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <TrendingUp className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">From Survey to Statistical Insight</h3>
                      <p className="text-sm text-muted-foreground">
                        The only survey tool with built-in Statistica integration. Run t-tests, ANOVA, regression, factor analysis, and 80+ more analyses directly on your survey data—no manual export or data wrangling required.
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
                Ready to Create Your Survey?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Build professional surveys, collect responses, and unlock deep insights—all in one platform.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <Button size="lg" className="gap-2">
                  <Sparkles className="w-5 h-5" />
                  Create Survey
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <BookOpen className="w-5 h-5" />
                  View Dashboard
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  No coding required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  QR code & link sharing
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Statistica integration
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
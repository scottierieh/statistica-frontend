
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, ClipboardList, BrainCircuit, Calculator, Database, Lightbulb, Zap, Users, Network, TrendingUp, Link2, ShieldCheck, FileSearch, Component, HeartPulse, Feather, GitBranch, Smile, Scaling, AreaChart, LineChart, Layers, Map, Repeat, ScanSearch, Atom, MessagesSquare, Share2, GitCommit, DollarSign, ThumbsUp, Handshake, Replace, Activity, Palette, Clock, Menu, Target, Globe, Briefcase, ChevronLeft, ChevronRight, LayoutDashboard, BarChart3, Brain, Boxes, Timer, MessageSquare, Wallet, Truck, ScatterChart, FileText, Check, Sparkles, X, BarChart, Send, Bot, User, BookOpen, HelpCircle, Wand2, Variable, ArrowDown, MousePointerClick, FileUp, Table2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { AnimatedGrid } from '@/components/animated-grid';

const securityImage = PlaceHolderImages.find(p => p.id === 'security-feature');
const apiIntegrationsImage = PlaceHolderImages.find(p => p.id === 'api-integrations');
const statisticaFeatureImage = PlaceHolderImages.find(p => p.id === 'statistica-feature');

const VisualImage = {
    imageUrl: 'https://github.com/scottierieh/statistica/blob/main/CBA461AF-EE60-4FF7-B36E-750F2692E141.png?raw=true',
    imageHint: 'visual'
  };
  
  const editImage = {
    imageUrl: 'https://github.com/scottierieh/statistica/blob/main/099675B4-D86A-47B9-8F52-C7F1927BEEE8.png?raw=true',
    imageHint: 'edit'
  };


  const analyzeImage = {
    imageUrl: 'https://github.com/scottierieh/statistica/blob/main/42FEFAB8-236D-46AC-BF28-FCDCAFDB0708.png?raw=true',
    imageHint: 'analyze'
  };

  const dashboardImage = {
    imageUrl: 'https://github.com/scottierieh/statistica/blob/main/A1F6C425-5571-4584-AF54-9D0C8E5556DD.png?raw=true',
    imageHint: 'dashboard analytics overview'
  };


// Analysis Categories Data
const analysisCategories = [
  {
    id: 'descriptive',
    name: 'Descriptive',
    icon: BarChart3,
    color: 'from-blue-500 to-blue-600',
    subcategories: [
      { name: 'Basic', items: ['Descriptive Statistics', 'Frequency Analysis', 'Variability Analysis'] },
      { name: 'Assumptions', items: ['Normality Test', 'Homogeneity of Variance', 'Outlier Detection', 'Linearity Check', 'Autocorrelation Test', 'Influence Diagnostics'] },
    ],
  },
  {
    id: 'comparison',
    name: 'Comparison',
    icon: GitBranch,
    color: 'from-emerald-500 to-emerald-600',
    subcategories: [
      { name: 'T-Tests', items: ['One-Sample', 'Independent Samples', "Welch's T-test", 'Paired Samples'] },
      { name: 'ANOVA', items: ['One-Way ANOVA', 'Two-Way ANOVA', 'ANCOVA', 'MANOVA', 'Repeated Measure ANOVA'] },
      { name: 'Non-Parametric', items: ['Mann-Whitney U Test', 'Wilcoxon Signed-Rank', 'Kruskal-Wallis H-Test', 'Friedman Test', 'McNemar’s Test'] },
      { name: 'Statistical Design', items: ['Power Analysis'] },
    ],
  },
  {
    id: 'relationship',
    name: 'Relationship',
    icon: Network,
    color: 'from-violet-500 to-violet-600',
    subcategories: [
      { name: 'Correlation', items: ['Correlation Analysis', 'Crosstab & Chi-Squared'] },
      { name: 'Regression', items: ['Simple Linear', 'Multiple Linear', 'Polynomial', 'Logistic', 'Lasso', 'Ridge', 'Robust', 'GLM'] },
      { name: 'Interpretation', items: ['Relative Importance', 'Feature Importance'] },
    ],
  },
  {
    id: 'predictive',
    name: 'Predictive',
    icon: Brain,
    color: 'from-rose-500 to-rose-600',
    subcategories: [
      { name: 'Classification', items: ['Linear Discriminant Analysis', 'Decision Tree', 'Gradient Boosting', 'Random Forest'] },
      { name: 'Survival', items: ['Survival Analysis'] },
      { name: 'Evaluation', items: ['Cross-Validation'] },
    ],
  },
  {
    id: 'structural',
    name: 'Structural',
    icon: Layers,
    color: 'from-amber-500 to-amber-600',
    subcategories: [
      { name: 'Factor Analysis', items: ['Reliability (Cronbach)', 'Exploratory (EFA)', 'Principal Component (PCA)', 'Reliability & Validity'] },
      { name: 'Path Analysis', items: ['Mediation Analysis', 'Moderation Analysis'] },
      { name: 'Network', items: ['Social Network Analysis'] },
    ],
  },
  {
    id: 'clustering',
    name: 'Clustering',
    icon: Boxes,
    color: 'from-cyan-500 to-cyan-600',
    subcategories: [
      { name: 'Distance-based', items: ['K-Means', 'K-Medoids'] },
      { name: 'Density-based', items: ['DBSCAN', 'HDBSCAN'] },
      { name: 'Hierarchical', items: ['Hierarchical Clustering (HCA)'] },
    ],
  },
  {
    id: 'timeseries',
    name: 'Time Series',
    icon: Timer,
    color: 'from-indigo-500 to-indigo-600',
    subcategories: [
      { name: 'Exploratory', items: ['Trend Analysis', 'Seasonal Decomposition', 'Rolling Statistics', 'Structural Break', 'Change Point Detection'] },
      { name: 'Diagnostic', items: ['ACF/PACF', 'ADF Test', 'Ljung-Box Test', 'ARCH-LM Test'] },
      { name: 'Modeling', items: ['Exponential Smoothing', 'ARIMA / SARIMAX'] },
      { name: 'Forecasting', items: ['Forecast Evaluation', 'Demand Forecasting', 'Forecast Horizon'] },
    ],
  },
  {
    id: 'text',
    name: 'Text Analysis',
    icon: MessageSquare,
    color: 'from-pink-500 to-pink-600',
    subcategories: [
      { name: 'NLP', items: ['Sentiment Analysis', 'Topic Modeling (LDA)', 'Word Cloud'] },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    icon: Briefcase,
    color: 'from-slate-600 to-slate-700',
    subcategories: [
      { name: 'Scenario Analysis', items: ['What-If Analysis', 'Threshold Optimization', 'Cost-Sensitive Analysis'] },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    icon: Target,
    color: 'from-orange-500 to-orange-600',
    subcategories: [
      { name: 'Performance', items: ['Importance-Performance Analysis', 'Funnel Analysis', 'NPS Analysis'] },
      { name: 'Customer', items: ['LTV Prediction', 'Association Rules', 'DEA', 'ROI Analysis'] },
    ],
  },
  {
    id: 'hr',
    name: 'Human Resources',
    icon: Users,
    color: 'from-teal-500 to-teal-600',
    subcategories: [
      { name: 'Workforce', items: ['Turnover/Retention Analysis', 'Key Talent Risk Matrix', 'Satisfaction-Engagement Matrix'] },
      { name: 'Operations', items: ['Attendance Pattern Analysis', 'Headcount Stability'] },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: Wallet,
    color: 'from-green-600 to-green-700',
    subcategories: [
      { name: 'Modeling', items: ['Portfolio Optimization', 'Fama-French Factor', 'Options Pricing'] },
      { name: 'Trading', items: ['Backtesting', 'Pair Trading'] },
      { name: 'Risk', items: ['Quantitative Risk Analysis', 'Credit Risk'] },
    ],
  },
  {
    id: 'quality',
    name: 'Quality Control',
    icon: ShieldCheck,
    color: 'from-red-500 to-red-600',
    subcategories: [
      { name: 'Monitoring', items: ['Control Charts', 'Process Capability', 'Attribute Control Charts', 'Gage R&R'] },
      { name: 'Improvement', items: ['Pareto Analysis', 'Acceptance Sampling'] },
    ],
  },
  {
    id: 'supplychain',
    name: 'Supply Chain',
    icon: Truck,
    color: 'from-purple-500 to-purple-600',
    subcategories: [
      { name: 'Optimization', items: ['Linear Programming', 'Nonlinear Programming', 'Goal Programming', 'Transportation Problem', 'VRP / TSP'] },
      { name: 'Inventory', items: ['EOQ Optimization', 'Inventory Policy', 'Lead Time Analysis'] },
      { name: 'Logistics', items: ['Fleet Optimization'] },
    ],
  },
];

// Calculate total analyses count
const totalAnalyses = analysisCategories.reduce((total, cat) => {
  return total + cat.subcategories.reduce((subTotal, sub) => subTotal + sub.items.length, 0);
}, 0);

// Sample data for POINT 01 animation
const sampleDataSummary = [
  { name: 'Age', type: 'Numeric', missing: 0, unique: 45, mean: 34.2, std: 12.8 },
  { name: 'Gender', type: 'Categorical', missing: 2, unique: 3, mean: null, std: null },
  { name: 'Income', type: 'Numeric', missing: 5, unique: 89, mean: 52400, std: 18200 },
  { name: 'Satisfaction', type: 'Ordinal', missing: 0, unique: 5, mean: 3.8, std: 1.1 },
  { name: 'Purchase', type: 'Binary', missing: 0, unique: 2, mean: null, std: null },
];

const sampleRecommendations = [
  {
    name: 'Multiple Regression',
    reason: 'Predict Income using Age, Gender, and Satisfaction as predictors. Suitable for continuous dependent variable with multiple predictors.',
    variables: ['Income', 'Age', 'Gender', 'Satisfaction'],
    icon: TrendingUp,
  },
  {
    name: 'Logistic Regression',
    reason: 'Predict Purchase behavior (binary outcome) based on demographic and satisfaction variables.',
    variables: ['Purchase', 'Age', 'Income', 'Satisfaction'],
    icon: BarChart3,
  },
  {
    name: 'One-Way ANOVA',
    reason: 'Compare Satisfaction scores across different Gender groups to identify significant differences.',
    variables: ['Satisfaction', 'Gender'],
    icon: Layers,
  },
];


export default function LandingPage() {
  const [activeProcessTab, setActiveProcessTab] = useState('analyze');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  // POINT 01 - Animation State
  const [point01Step, setPoint01Step] = useState(0); // 0: upload, 1: analyzing, 2: summary, 3: recommendations

  // POINT 03 - Chat Animation State (showing only last 3 messages)
  const [visibleMessages, setVisibleMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatStep, setChatStep] = useState(0);

  const chatConversations = [
    { role: 'user' as const, text: "What does the p-value of 0.023 mean?" },
    { role: 'ai' as const, text: "The p-value of 0.023 indicates statistical significance at α = 0.05. There's only a 2.3% probability that this occurred by chance." },
    { role: 'user' as const, text: "Format this in APA style please" },
    { role: 'ai' as const, text: "t(48) = 2.34, p = .023, d = 0.67, 95% CI [0.12, 1.22]. The result shows a significant difference with medium-to-large effect." },
    { role: 'user' as const, text: "What is Cohen's d?" },
    { role: 'ai' as const, text: "Cohen's d measures effect size. Your d = 0.67 is medium-to-large (0.2 = small, 0.5 = medium, 0.8 = large)." },
    { role: 'user' as const, text: "How can I use these findings?" },
    { role: 'ai' as const, text: "You can: 1) Support your hypothesis, 2) Discuss practical implications, 3) Compare with prior research, 4) Plan follow-up studies." },
  ];

  // Auto-animate POINT 01
  useEffect(() => {
    const timer = setInterval(() => {
      setPoint01Step(prev => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Auto-animate POINT 03 Chat - show last 2-3 messages, fade out old ones
  useEffect(() => {
    const timer = setInterval(() => {
      setChatStep(prev => {
        const nextStep = (prev + 1) % (chatConversations.length + 2); // +2 for pause
        
        if (nextStep < chatConversations.length) {
          // Show messages progressively, keep only last 3
          const endIndex = nextStep + 1;
          const startIndex = Math.max(0, endIndex - 3);
          setVisibleMessages(chatConversations.slice(startIndex, endIndex));
        } else if (nextStep === chatConversations.length + 1) {
          // Reset
          setVisibleMessages([]);
        }
        
        return nextStep;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  
  const processTabs = [
      { 
        id: 'edit', 
        label: 'DataPrep', 
        image: editImage,
        title: 'Data Editing',
        features: [
          'Multi-tab File Management',
          'CSV, Excel, JSON Support',
          'SQL-style JOIN Operations',
          'Type Coercion (Text/Number)',
          'Missing Value Imputation',
          'Data Transformation',
          '50-step Undo/Redo',
          'Keyboard Shortcuts',
          'Drag & Drop Upload',
          'Real-time Column Stats',
          'One-Hot Encoding'
        ]
      },
      { 
        id: 'analyze', 
        label: 'Statistica', 
        image: analyzeImage,
        title: 'Statistical Analysis',
        features: [
            '100+ Statistical Tests', 
            'Auto Interpretation', 
            'APA Formatting', 
            'Post-hoc Tests',
            'Power Analysis',
            'Publication-Ready Charts',
            'Assumption Checking',
            'Smart Recommendations',
            'Real-time Results',
            'No Coding Required'
          ]   },
      { 
        id: 'visualize', 
        label: 'Visualization', 
        image: VisualImage,
        title: 'Visualization',
        features: ['Interactive Charts', 'Export to PNG/PDF', 'Custom Themes', 'Dashboard Builder', 'Real-time Preview', 'Template Library']
      },
      { 
        id: 'dashboard', 
        label: 'Dashboard', 
        image: dashboardImage,
        title: 'Dashboard',
        features: [
          'Real-time Analytics',
          'Customizable Widgets',
          'KPI Monitoring',
          'Team Collaboration',
          'Scheduled Reports',
          'Data Source Integration',
          'Role-based Access',
          'Export & Sharing',
          'Alert Notifications',
          'Historical Trends'
        ]
      },
  ];

  const currentProcessTab = processTabs.find(t => t.id === activeProcessTab);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };
  
  const heroTitle = "From Data to Decision, ";
  const titleVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };
  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto flex items-center">
            <div className="flex-1 flex justify-start">
                <Link href="/" className="flex items-center justify-center gap-2">
                    <Calculator className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-headline font-bold">Skarii</h1>
                </Link>
            </div>
             <nav className="hidden lg:flex items-center gap-4 sm:gap-6 flex-1 justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-sm font-medium">
                      Features <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild><Link href="/features/statistica">Statistica</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/features/data-editor">Data Editor</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/features/visualization">Visualization</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/features/dashboard">Dashboard</Link></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="text-sm font-medium">
                        Solutions <ChevronDown className="w-4 h-4 ml-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[480px] p-2">
                      <div className="grid grid-cols-2 gap-2">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            By Industry
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild><Link href="/solutions/industry/marketing">Marketing</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link href="/solutions/industry/hr">HR</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link href="/solutions/industry/manufacturing">Manufacturing</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link href="/solutions/industry/logistics">Logistics</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link href="/solutions/industry/education">Education</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link href="/solutions/industry/finance">Finance</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link href="/solutions/industry/economics">Economics</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link href="/solutions/industry/healthcare">Healthcare</Link></DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            By Role
                          </DropdownMenuLabel>
                           <DropdownMenuSeparator />
                          <DropdownMenuItem asChild><Link href="/solutions/role/data-analyst">Data Analyst</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link href="/solutions/role/consultant">Consultant</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link href="/solutions/role/student">Student</Link></DropdownMenuItem>
                        </DropdownMenuGroup>
                      </div>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Link className="text-sm font-medium hover:underline underline-offset-4" href="/pricing">Pricing</Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-sm font-medium">
                      Support <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <Link href="/faq">Help Center</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/blog">Blog</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/whats-new">What's New</Link></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </nav>
            <div className="flex-1 flex justify-end items-center gap-2">
                <div className="hidden lg:flex items-center gap-2">
                    <Button asChild><Link href="/login">Get Started</Link></Button>
                    <Button variant="ghost" asChild><Link href="/contact">Contact</Link></Button>
                </div>
                 <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="lg:hidden">
                            <Menu className="h-6 w-6" />
                            <span className="sr-only">Toggle navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right">
                        <nav className="grid gap-6 text-lg font-medium pt-8">
                           <DropdownMenu>
                                <DropdownMenuTrigger className="flex items-center text-muted-foreground hover:text-foreground">Features <ChevronDown className="w-4 h-4 ml-1" /></DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem asChild><Link href="/features/statistica" onClick={() => setIsMobileMenuOpen(false)}>Statistica</Link></DropdownMenuItem>
                                    <DropdownMenuItem asChild><Link href="/features/data-editor" onClick={() => setIsMobileMenuOpen(false)}>Data Editor</Link></DropdownMenuItem>
                                    <DropdownMenuItem asChild><Link href="/features/visualization" onClick={() => setIsMobileMenuOpen(false)}>Visualization</Link></DropdownMenuItem>
                                    <DropdownMenuItem asChild><Link href="/features/dashboard" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link></DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger className="flex items-center text-muted-foreground hover:text-foreground">Solutions <ChevronDown className="w-4 h-4 ml-1" /></DropdownMenuTrigger>
                                <DropdownMenuContent className="w-[280px] p-3">
                                    <Link href="/solutions" className="text-sm font-medium hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>
                                        Solutions Overview →
                                    </Link>
                                    <DropdownMenuSeparator className="my-2" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Industry</h4>
                                            <div className="space-y-1 text-sm">
                                                <DropdownMenuItem asChild><Link href="/solutions/industry/marketing" onClick={() => setIsMobileMenuOpen(false)}>Marketing</Link></DropdownMenuItem>
                                                <DropdownMenuItem asChild><Link href="/solutions/industry/hr" onClick={() => setIsMobileMenuOpen(false)}>HR</Link></DropdownMenuItem>
                                                <DropdownMenuItem asChild><Link href="/solutions/industry/education" onClick={() => setIsMobileMenuOpen(false)}>Education</Link></DropdownMenuItem>
                                                <DropdownMenuItem asChild><Link href="/solutions/industry/finance" onClick={() => setIsMobileMenuOpen(false)}>Finance</Link></DropdownMenuItem>
                                                <DropdownMenuItem asChild><Link href="/solutions/industry/healthcare" onClick={() => setIsMobileMenuOpen(false)}>Healthcare</Link></DropdownMenuItem>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Role</h4>
                                            <div className="space-y-1 text-sm">
                                                <DropdownMenuItem asChild><Link href="/solutions/role/data-analyst" onClick={() => setIsMobileMenuOpen(false)}>Data Analyst</Link></DropdownMenuItem>
                                                <DropdownMenuItem asChild><Link href="/solutions/role/consultant" onClick={() => setIsMobileMenuOpen(false)}>Consultant</Link></DropdownMenuItem>
                                                <DropdownMenuItem asChild><Link href="/solutions/role/student" onClick={() => setIsMobileMenuOpen(false)}>Student</Link></DropdownMenuItem>
                                            </div>
                                        </div>
                                    </div>
                                </DropdownMenuContent>
                           </DropdownMenu>
                            <Link href="/pricing" className="text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>Pricing</Link>
                            <Link href="/faq" className="text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>Support</Link>
                            <Separator className="my-2" />
                            <Button asChild><Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Get Started</Link></Button>
                            <Button variant="outline" asChild><Link href="/contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</Link></Button>
                        </nav>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section with Animated Gradient Background */}
        <section className="relative pt-20 pb-20 lg:pt-24 lg:pb-32 text-center overflow-hidden">
            {/* Animated Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100" style={{ zIndex: 0 }}>
              {/* Floating Light Beams */}
              <motion.div 
                  className="absolute w-[200%] h-[3px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent blur-sm"
                  style={{
                    top: '15%',
                    left: '-50%',
                    rotate: -15,
                  }}
                  animate={{
                    y: [0, 40, 0],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                {/* Beam 2 */}
                <motion.div 
                  className="absolute w-[200%] h-[4px] bg-gradient-to-r from-transparent via-purple-400/50 to-transparent blur-md"
                  style={{
                    top: '35%',
                    left: '-50%',
                    rotate: -20,
                  }}
                  animate={{
                    y: [0, -50, 0],
                    opacity: [0.4, 0.7, 0.4],
                  }}
                  transition={{
                    duration: 16,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                {/* Beam 3 */}
                <motion.div 
                  className="absolute w-[200%] h-[3px] bg-gradient-to-r from-transparent via-cyan-400/55 to-transparent blur-sm"
                  style={{
                    top: '55%',
                    left: '-50%',
                    rotate: -10,
                  }}
                  animate={{
                    y: [0, 35, 0],
                    opacity: [0.45, 0.75, 0.45],
                  }}
                  transition={{
                    duration: 14,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                {/* Beam 4 */}
                <motion.div 
                  className="absolute w-[200%] h-[5px] bg-gradient-to-r from-transparent via-indigo-400/45 to-transparent blur-lg"
                  style={{
                    top: '75%',
                    left: '-50%',
                    rotate: -18,
                  }}
                  animate={{
                    y: [0, -45, 0],
                    opacity: [0.35, 0.6, 0.35],
                  }}
                  transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                {/* Soft Glow Orbs */}
                <motion.div 
                  className="absolute w-[500px] h-[500px] rounded-full bg-blue-300/40 blur-3xl"
                  style={{
                    top: '-10%',
                    right: '-15%',
                  }}
                  animate={{
                    x: [0, -40, 0],
                    y: [0, 30, 0],
                    scale: [1, 1.15, 1],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div 
                  className="absolute w-[450px] h-[450px] rounded-full bg-purple-300/35 blur-3xl"
                  style={{
                    bottom: '-5%',
                    left: '-10%',
                  }}
                  animate={{
                    x: [0, 50, 0],
                    y: [0, -40, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div 
                  className="absolute w-[350px] h-[350px] rounded-full bg-pink-300/30 blur-3xl"
                  style={{
                    top: '40%',
                    left: '25%',
                  }}
                  animate={{
                    x: [0, 30, 0],
                    y: [0, -35, 0],
                    scale: [1, 1.12, 1],
                  }}
                  transition={{
                    duration: 22,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

               
              </div>
            </div>
            
            {/* Gradient Overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/40" style={{ zIndex: 1 }} />
            
            {/* Content */}
            <div className="container mx-auto px-4 relative" style={{ zIndex: 10 }}>
                 <motion.div initial="hidden" animate="visible" variants={containerVariants}>
                      <motion.h1
                        className="text-4xl md:text-6xl font-extrabold font-headline tracking-tighter mb-6"
                        variants={titleVariants}
                      >
                        <span className="text-foreground">
                            {heroTitle.split("").map((letter, index) => (
                                <motion.span key={index} variants={letterVariants}>
                                    {letter}
                                </motion.span>
                            ))}
                        </span>
                        <span className="text-primary">
                            {"Instantly".split("").map((letter, index) => (
                                <motion.span key={index} variants={letterVariants}>
                                    {letter}
                                </motion.span>
                            ))}
                        </span>
                      </motion.h1>
                    <motion.p variants={itemVariants} className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground mb-10">
                        Our intelligent platform automates complex statistical analysis, generates insightful visualizations, and delivers clear, actionable reports.
                    </motion.p>
                    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
                        <Button size="lg" asChild className="text-base sm:text-lg py-6 sm:py-7 px-6 sm:px-8 shadow-lg shadow-primary/30 w-full sm:w-auto">
                            <Link href="/dashboard">Try For Free <ArrowRight className="ml-2 w-5 h-5"/></Link>
                        </Button>
                         <Button size="lg" variant="outline" asChild className="text-base sm:text-lg py-6 sm:py-7 px-6 sm:px-8 bg-white/80 backdrop-blur-sm w-full sm:w-auto">
                            <Link href="/pricing">View Pricing</Link>
                        </Button>
                    </motion.div>
                    
                     {/* Tabbed Feature Display */}
                     <motion.div 
                        variants={itemVariants} 
                        className="mt-12 sm:mt-16 md:mt-24 max-w-6xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                     >
                         <div className="flex justify-center gap-0.5 sm:gap-4 md:gap-8 border-b bg-white/80 backdrop-blur-sm rounded-t-xl">
                             {processTabs.map(tab => (
                                 <button
                                     key={tab.id}
                                     onClick={() => setActiveProcessTab(tab.id)}
                                     className={cn(
                                         "py-2.5 sm:py-3 px-2 sm:px-4 text-[11px] sm:text-sm md:text-base font-semibold transition-colors relative whitespace-nowrap",
                                         activeProcessTab === tab.id
                                             ? "text-primary"
                                             : "text-muted-foreground hover:text-primary"
                                     )}
                                 >
                                     <div className="flex items-center gap-0.5 sm:gap-2">
                                         {activeProcessTab === tab.id && <motion.div layoutId="active-tab-icon" className="transition-all hidden sm:block"><Zap className="w-3 h-3 sm:w-4 sm:h-4"/></motion.div>}
                                         <span className="hidden sm:inline">{tab.label}</span>
                                         <span className="sm:hidden">{tab.label.length > 8 ? tab.label.slice(0, 7) + '.' : tab.label}</span>
                                     </div>
                                      {activeProcessTab === tab.id && (
                                        <motion.div
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                                            layoutId="underline"
                                        />
                                    )}
                                 </button>
                             ))}
                         </div>
                         
                         {/* Image + Description Layout */}
                         <div className="relative mt-0 w-full overflow-hidden bg-white rounded-b-lg shadow-xl border">
                           <div className="flex flex-col md:flex-row">
                             {/* 이미지 영역 */}
                             <div className="w-full md:w-3/4 aspect-[4/3] sm:aspect-video relative bg-slate-100">
                               <AnimatePresence mode="wait">
                                 <motion.div
                                   key={activeProcessTab}
                                   initial={{ opacity: 0, scale: 0.98 }}
                                   animate={{ opacity: 1, scale: 1 }}
                                   exit={{ opacity: 0, scale: 0.98 }}
                                   transition={{ duration: 0.4, ease: 'easeInOut' }}
                                   className="absolute inset-0"
                                 >
                                   {currentProcessTab?.image && (
                                     <Image
                                       src={currentProcessTab.image.imageUrl}
                                       alt={currentProcessTab.image.imageHint}
                                       fill
                                       className="object-cover object-top sm:object-center"
                                       data-ai-hint={currentProcessTab.image.imageHint}
                                     />
                                   )}
                                 </motion.div>
                               </AnimatePresence>
                             </div>
                             
                             {/* 설명 영역 */}
                             <div className="w-full md:w-1/4 p-4 sm:p-6 bg-slate-50 flex flex-col justify-center border-t md:border-t-0 md:border-l">
                               <AnimatePresence mode="wait">
                                 <motion.div
                                   key={activeProcessTab}
                                   initial={{ opacity: 0, x: 20 }}
                                   animate={{ opacity: 1, x: 0 }}
                                   exit={{ opacity: 0, x: -20 }}
                                   transition={{ duration: 0.3 }}
                                   className="space-y-3 sm:space-y-4"
                                 >
                                   <div>
                                     <h3 className="font-bold text-base sm:text-lg text-left mb-1">{currentProcessTab?.title}</h3>
                                     <div className="w-8 h-1 bg-primary rounded-full"></div>
                                   </div>
                                   <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 sm:space-y-2 text-left max-h-[200px] sm:max-h-none overflow-y-auto">
                                     {currentProcessTab?.features.slice(0, 6).map((feature, index) => (
                                       <li key={index} className="flex items-center gap-2">
                                         <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                                         <span className="line-clamp-1">{feature}</span>
                                       </li>
                                     ))}
                                     {(currentProcessTab?.features?.length ?? 0) > 6 && (
                                       <li className="text-primary text-xs">+{(currentProcessTab?.features?.length ?? 0) - 6} more</li>
                                     )}
                                   </ul>
                                 </motion.div>
                               </AnimatePresence>
                             </div>
                           </div>
                         </div>
                     </motion.div>
                </motion.div>
            </div>
        </section>

   

        {/* POINT 01: AI Analysis Recommendation - RecommendationPage Style */}
        <section className="py-20 lg:py-28 bg-white overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: Text Content */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <span className="inline-block px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-full mb-6">
                  POINT 01
                </span>
                <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                  Not sure which analysis to run?<br />
                  <span className="text-primary">Let AI recommend for you.</span>
                </h2>
                <p className="text-muted-foreground text-lg mb-6">
                  Upload your data and our AI will analyze your variables, detect their types, and suggest the most suitable statistical methods — all automatically.
                </p>
                <ul className="space-y-3">
                  {[
                    'Auto-detect numeric, categorical & ordinal variables',
                    'Smart recommendations based on data structure',
                    'Clear explanations for each suggestion',
                    'One-click to run the recommended analysis',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Right: Animated RecommendationPage UI */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <div className="bg-slate-100 rounded-2xl p-4 shadow-xl border border-slate-200 h-[420px] overflow-hidden">
                  <AnimatePresence mode="wait">
                    {/* Step 0: File Drop Animation */}
                    {point01Step === 0 && (
                      <motion.div
                        key="upload"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-xl p-6 border-2 border-dashed border-primary/30 h-[388px] flex flex-col items-center justify-center relative overflow-hidden"
                      >
                        {/* Animated file icon dropping in */}
                        <motion.div
                          initial={{ y: -80, opacity: 0, rotate: -5 }}
                          animate={{ y: 0, opacity: 1, rotate: 0 }}
                          transition={{ 
                            duration: 0.6, 
                            ease: "easeOut",
                            opacity: { duration: 0.3 }
                          }}
                          className="relative mb-4"
                        >
                          {/* File icon with data visualization */}
                          <div className="w-20 h-24 bg-white rounded-lg border-2 border-slate-200 shadow-lg relative">
                            {/* File fold corner */}
                            <div className="absolute top-0 right-0 w-6 h-6 bg-slate-100 rounded-bl-lg border-l-2 border-b-2 border-slate-200" />
                            {/* CSV text */}
                            <div className="absolute top-8 left-1/2 -translate-x-1/2">
                              <span className="text-xs font-bold text-primary">.CSV</span>
                            </div>
                            {/* Mini data rows */}
                            <div className="absolute bottom-3 left-2 right-2 space-y-1">
                              <div className="flex gap-1">
                                <div className="h-1.5 w-3 bg-primary/40 rounded-full" />
                                <div className="h-1.5 w-4 bg-slate-200 rounded-full" />
                                <div className="h-1.5 w-2 bg-slate-200 rounded-full" />
                              </div>
                              <div className="flex gap-1">
                                <div className="h-1.5 w-3 bg-primary/40 rounded-full" />
                                <div className="h-1.5 w-2 bg-slate-200 rounded-full" />
                                <div className="h-1.5 w-4 bg-slate-200 rounded-full" />
                              </div>
                              <div className="flex gap-1">
                                <div className="h-1.5 w-3 bg-primary/40 rounded-full" />
                                <div className="h-1.5 w-3 bg-slate-200 rounded-full" />
                                <div className="h-1.5 w-3 bg-slate-200 rounded-full" />
                              </div>
                            </div>
                          </div>
                          {/* Drop shadow */}
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-300/50 rounded-full blur-sm" />
                        </motion.div>

                        {/* Text */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4, duration: 0.3 }}
                          className="text-center"
                        >
                          <p className="font-semibold text-slate-700">Drop your data file</p>
                          <p className="text-sm text-muted-foreground mt-1">CSV, Excel, JSON supported</p>
                        </motion.div>

                        {/* Subtle pulsing border */}
                        <div className="absolute inset-3 border-2 border-primary/10 rounded-lg pointer-events-none animate-pulse" />
                      </motion.div>
                    )}

                    {/* Step 1: Analyzing */}
                    {point01Step === 1 && (
                      <motion.div
                        key="analyzing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-xl p-8 h-[388px] flex items-center justify-center"
                      >
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse" />
                            <div className="relative p-4 rounded-full bg-primary/10">
                              <Wand2 className="w-8 h-8 text-primary animate-pulse" />
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-slate-700">Analyzing your data...</p>
                            <p className="text-sm text-muted-foreground">Detecting variable types</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 2: Data Summary Table */}
                    {point01Step === 2 && (
                      <motion.div
                        key="summary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-xl overflow-hidden h-[388px] flex flex-col"
                      >
                        <div className="p-4 border-b flex items-center gap-2">
                          <Table2 className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-sm">Data Summary</span>
                          <span className="text-xs text-muted-foreground ml-auto">5 variables detected</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold">Variable</th>
                                <th className="px-3 py-2 text-left font-semibold">Type</th>
                                <th className="px-3 py-2 text-center font-semibold">Missing</th>
                                <th className="px-3 py-2 text-right font-semibold">Mean</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sampleDataSummary.map((row, i) => (
                                <motion.tr 
                                  key={row.name}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                  className="border-t"
                                >
                                  <td className="px-3 py-2 font-medium">{row.name}</td>
                                  <td className="px-3 py-2">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-full text-xs",
                                      row.type === 'Numeric' ? "bg-blue-100 text-blue-700" :
                                      row.type === 'Categorical' ? "bg-purple-100 text-purple-700" :
                                      row.type === 'Ordinal' ? "bg-amber-100 text-amber-700" :
                                      "bg-green-100 text-green-700"
                                    )}>
                                      {row.type}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {row.missing > 0 ? (
                                      <span className="text-amber-600">{row.missing}</span>
                                    ) : (
                                      <span className="text-slate-400">0</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono">
                                    {row.mean?.toLocaleString() ?? '—'}
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 3: Recommendations */}
                    {point01Step === 3 && (
                      <motion.div
                        key="recommendations"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="h-[388px] flex flex-col"
                      >
                        <div className="flex items-center gap-2 px-1 mb-3">
                          <Bot className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-sm">Recommended Analyses</span>
                        </div>
                        <div className="space-y-3 flex-1">
                        {sampleRecommendations.map((rec, i) => (
                          <motion.div
                            key={rec.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className="bg-white rounded-xl p-4 border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                <rec.icon className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-slate-800 group-hover:text-primary transition-colors">{rec.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rec.reason}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {rec.variables.slice(0, 3).map((v, vi) => (
                                    <span key={vi} className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">{v}</span>
                                  ))}
                                  {rec.variables.length > 3 && (
                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-400">+{rec.variables.length - 3}</span>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                            </div>
                          </motion.div>
                        ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* POINT 02: Interactive Analysis Explorer */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-slate-50 to-slate-100 overflow-hidden">
          <div className="container mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <span className="inline-block px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-full mb-6">
                POINT 02
              </span>
              <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                Hired a data analyst but running<br />
                <span className="text-primary">the same basic tests over and over?</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-3xl mx-auto mb-4">
                From descriptive statistics to machine learning, from marketing analytics to supply chain optimization—
              </p>
              <div className="flex items-center justify-center gap-3">
                <motion.span 
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="text-5xl md:text-6xl font-extrabold text-primary"
                >
                  {totalAnalyses}+
                </motion.span>
                <span className="text-xl md:text-2xl font-semibold text-slate-700">
                  statistical analyses<br />with automated reports
                </span>
              </div>
            </motion.div>

            {/* Category Grid */}
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                {analysisCategories.map((category, index) => (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
                    className={cn(
                      "relative p-4 rounded-xl text-center transition-all duration-300 group",
                      activeCategory === category.id 
                        ? "bg-gradient-to-br " + category.color + " text-white shadow-xl scale-105 z-10" 
                        : "bg-white hover:shadow-lg border border-slate-200 hover:border-transparent hover:bg-gradient-to-br hover:" + category.color + " hover:text-white"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 transition-all",
                      activeCategory === category.id 
                        ? "bg-white/20" 
                        : "bg-gradient-to-br " + category.color + " group-hover:bg-white/20"
                    )}>
                      <category.icon className={cn(
                        "w-5 h-5 transition-colors",
                        activeCategory === category.id ? "text-white" : "text-white"
                      )} />
                    </div>
                    <h3 className={cn(
                      "text-xs font-bold leading-tight transition-colors",
                      activeCategory === category.id ? "text-white" : "text-slate-700 group-hover:text-white"
                    )}>
                      {category.name}
                    </h3>
                    <p className={cn(
                      "text-[10px] mt-1 transition-colors",
                      activeCategory === category.id ? "text-white/80" : "text-slate-400 group-hover:text-white/80"
                    )}>
                      {category.subcategories.reduce((acc, sub) => acc + sub.items.length, 0)} analyses
                    </p>
                  </motion.button>
                ))}
              </div>

              {/* Expanded Analysis Details */}
              <AnimatePresence mode="wait">
                {activeCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200">
                      {(() => {
                        const cat = analysisCategories.find(c => c.id === activeCategory);
                        if (!cat) return null;
                        return (
                          <>
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-3">
                                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br", cat.color)}>
                                  <cat.icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h4 className="text-xl font-bold">{cat.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {cat.subcategories.reduce((acc, sub) => acc + sub.items.length, 0)} statistical methods available
                                  </p>
                                </div>
                              </div>
                              <button 
                                onClick={() => setActiveCategory(null)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                              >
                                <X className="w-5 h-5 text-slate-400" />
                              </button>
                            </div>
                            
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {cat.subcategories.map((sub, subIndex) => (
                                <motion.div
                                  key={sub.name}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: subIndex * 0.05 }}
                                  className="space-y-2"
                                >
                                  <h5 className="font-semibold text-sm text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full bg-gradient-to-br", cat.color)}></div>
                                    {sub.name}
                                  </h5>
                                  <div className="space-y-1">
                                    {sub.items.map((item, i) => (
                                      <motion.div
                                        key={item}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: subIndex * 0.05 + i * 0.02 }}
                                        onMouseEnter={() => setHoveredItem(item)}
                                        onMouseLeave={() => setHoveredItem(null)}
                                        className={cn(
                                          "flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer text-sm",
                                          hoveredItem === item 
                                            ? "bg-gradient-to-r " + cat.color + " text-white shadow-md" 
                                            : "hover:bg-slate-50"
                                        )}
                                      >
                                        <Check className={cn(
                                          "w-4 h-4 flex-shrink-0",
                                          hoveredItem === item ? "text-white" : "text-primary"
                                        )} />
                                        <span className="truncate">{item}</span>
                                        {hoveredItem === item && (
                                          <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="ml-auto flex-shrink-0"
                                          >
                                            <FileText className="w-4 h-4" />
                                          </motion.div>
                                        )}
                                      </motion.div>
                                    ))}
                                  </div>
                                </motion.div>
                              ))}
                            </div>

                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.3 }}
                              className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20"
                            >
                              <div className="flex items-center gap-3">
                                <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
                                <p className="text-sm text-slate-700">
                                  Every analysis includes <span className="font-semibold text-primary">auto-generated APA reports</span> with interpretations, tables, and visualizations.
                                </p>
                              </div>
                            </motion.div>
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hint text when no category selected */}
              {!activeCategory && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-muted-foreground text-sm mt-4"
                >
                  👆 Click any category to explore available analyses
                </motion.p>
              )}

              {/* Bottom Stats */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
              >
                {[
                  { number: '14', label: 'Analysis Domains', sublabel: 'Statistics to Supply Chain', icon: Layers },
                  { number: `${totalAnalyses}+`, label: 'Statistical Methods', sublabel: 'And growing', icon: BarChart },
                  { number: 'Auto', label: 'Report Generation', sublabel: 'APA format ready', icon: FileText },
                  { number: '1-Click', label: 'Analysis Execution', sublabel: 'No coding required', icon: Zap },
                ].map((stat, i) => (
                  <motion.div 
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="text-center bg-white rounded-2xl p-6 shadow-lg border border-slate-100"
                  >
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mb-3">
                      <stat.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary mb-1">{stat.number}</div>
                    <div className="text-sm font-semibold text-slate-700">{stat.label}</div>
                    <div className="text-xs text-muted-foreground">{stat.sublabel}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* POINT 03: AI Chat for Results - Messages fade out instead of scroll */}
        <section className="py-12 sm:py-16 lg:py-28 bg-white overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center">
              {/* Left: Chat Animation - No scroll, fade in/out */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="order-2 lg:order-1"
              >
                <div className="bg-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl max-w-lg mx-auto">
                  {/* Chat Header */}
                  <div className="flex items-center gap-2 sm:gap-3 pb-2 sm:pb-4 border-b border-slate-700">
                    <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-xs sm:text-base">Skarii AI Assistant</p>
                      <p className="text-[9px] sm:text-xs text-slate-400 hidden sm:block">Ask anything about your results</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-400 animate-pulse"></span>
                      <span className="text-[9px] sm:text-xs text-green-400">Online</span>
                    </div>
                  </div>

                  {/* Chat Messages - Fixed height, no scroll, fade in/out */}
                  <div className="py-2 sm:py-4 h-[160px] sm:h-[280px] flex flex-col justify-end">
                    <AnimatePresence mode="popLayout">
                      {visibleMessages.map((msg, index) => (
                        <motion.div
                          key={`${chatStep}-${index}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.3 }}
                          className={cn(
                            "flex gap-2 sm:gap-3 mb-2 sm:mb-3",
                            msg.role === 'user' ? "justify-end" : "justify-start"
                          )}
                        >
                          {msg.role === 'ai' && (
                            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center flex-shrink-0">
                              <Bot className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white" />
                            </div>
                          )}
                          <div className={cn(
                            "max-w-[85%] sm:max-w-[80%] rounded-xl sm:rounded-2xl px-2.5 sm:px-4 py-1.5 sm:py-2.5",
                            msg.role === 'user' 
                              ? "bg-primary text-white rounded-br-sm" 
                              : "bg-slate-800 text-slate-100 rounded-bl-sm"
                          )}>
                            <p className="text-[10px] sm:text-sm leading-relaxed">{msg.text}</p>
                          </div>
                          {msg.role === 'user' && (
                            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                              <User className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-slate-300" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {/* Typing Indicator */}
                    {visibleMessages.length > 0 && visibleMessages[visibleMessages.length - 1]?.role === 'user' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-2"
                      >
                        <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white" />
                        </div>
                        <div className="bg-slate-800 rounded-xl sm:rounded-2xl rounded-bl-sm px-2.5 sm:px-4 py-1.5 sm:py-2.5">
                          <div className="flex gap-1">
                            <span className="w-1 h-1 sm:w-2 sm:h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1 h-1 sm:w-2 sm:h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1 h-1 sm:w-2 sm:h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="pt-2 sm:pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-2 bg-slate-800 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-2 sm:py-3">
                      <input 
                        type="text" 
                        placeholder="Ask about your results..." 
                        className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-[10px] sm:text-sm"
                        disabled
                      />
                      <button className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors">
                        <Send className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right: Text Content */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="order-1 lg:order-2"
              >
                <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-primary text-white text-xs sm:text-sm font-bold rounded-full mb-4 sm:mb-6">
                  POINT 03
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-headline mb-3 sm:mb-4">
                  Got your results but<br />
                  <span className="text-primary">not sure what they mean?</span>
                </h2>
                <p className="text-muted-foreground text-sm sm:text-lg mb-4 sm:mb-8 hidden sm:block">
                  Our AI assistant helps you understand and utilize your statistical results. Ask questions in plain language and get expert-level explanations instantly.
                </p>
                
                {/* Feature cards - hidden on mobile, shown on sm+ */}
                <div className="hidden sm:grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: BookOpen, title: 'Explain Terms', desc: "What's a p-value? Effect size? CI?" },
                    { icon: FileText, title: 'APA Formatting', desc: 'Convert results to publication format' },
                    { icon: HelpCircle, title: 'Interpretation', desc: 'Understand what your results mean' },
                    { icon: Lightbulb, title: 'Next Steps', desc: 'How to use findings in your research' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-primary/30 hover:shadow-md transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {/* Mobile: Simple inline list */}
                <div className="flex flex-wrap gap-2 sm:hidden">
                  {['Explain Terms', 'APA Format', 'Interpretation', 'Next Steps'].map((item) => (
                    <span key={item} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* A World of Knowledge Section */}
        <section className="py-20 lg:py-24 bg-slate-100">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                        A World of Knowledge at Your Fingertips
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        From basic t-tests to advanced structural equation modeling, our platform supports the full spectrum of statistical analysis.
                    </p>
                </div>
                <AnimatedGrid />
            </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-24 bg-gradient-to-br from-primary to-primary/80 text-white">
            <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-headline mb-6">
                            Ready to Transform Your Data Analysis?
                        </h2>
                        <p className="text-lg md:text-xl text-primary-foreground/90 mb-8">
                            Join thousands of researchers and analysts who trust Skarii for their statistical analysis needs.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                            <Button size="lg" variant="secondary" asChild className="text-base px-8 py-6 w-full sm:w-auto">
                                <Link href="/dashboard">
                                    Start Free Trial
                                    <ArrowRight className="ml-2 w-5 h-5"/>
                                </Link>
                            </Button>
                             <Button size="lg" variant="outline" asChild className="text-base px-8 py-6 w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-primary">
                                <Link href="/contact">Talk to Sales</Link>
                            </Button>
                        </div>
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-primary-foreground/80">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>No credit card required</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>14-day free trial</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Cancel anytime</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-muted/40">
        <p className="text-xs text-muted-foreground">
          &copy; 2024 Skarii. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">Terms of Service</Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}

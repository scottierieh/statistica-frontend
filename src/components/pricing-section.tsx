'use client';

import React, { useState, useMemo } from 'react';
import { Check, ArrowRight, User, Building, TrendingUp, Eye, LucideIcon, BarChart3, ShieldCheck, GitBranch, Landmark, Layers, Timer, Users, Code, FileText, Target, Route, Gauge, Workflow, Brain, Briefcase, Compass, BrainCircuit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const plans = [
    {
        title: "Free",
        type: 'Individual',
        icon: User,
        description: "Explore with example data.",
        price: { monthly: 0, yearly: 0 },
        features: [
            "Run analyses on pre-loaded example datasets",
            "15 Analyses/month",
            "Access to basic analysis types (Descriptives, Assumptions)",
            "No data uploads for custom analysis"
        ],
        cta: "Start for Free",
        includedModes: ['Basic']
    },
    {
        title: "Plus",
        type: 'Individual',
        icon: Compass,
        description: "Full Explore mode for data analysis.",
        price: { monthly: 40, yearly: 32 },
        features: [
            "Everything in Free, plus:",
            "Upload your own data (CSV, Excel)",
            "100 Analyses/month",
            "Full Explore Suite: Descriptive, Assumptions, Comparison, Relationship, Econometrics",
            "40+ statistical methods",
            "Export reports & Python code"
        ],
        cta: "Go Plus",
        includedModes: ['Explore']
    },
    {
        title: "Pro",
        type: 'Individual',
        icon: BrainCircuit,
        description: "Complete analytics & decision suite.",
        price: { monthly: 80, yearly: 64 },
        features: [
            "Everything in Plus, plus:",
            "Unlimited Analyses",
            "Full Model Suite: Predictive, Clustering, Time Series, Structural",
            "Strategic Decision Tools included",
            "80+ methods + AI Report Generation"
        ],
        cta: "Go Pro",
        highlight: true,
        includedModes: ['Explore', 'Model', 'Strategic Decision']
    },
    {
        title: "Team Plus",
        type: 'Team',
        icon: Building,
        description: "Collaborative Explore mode.",
        price: { monthly: 35, yearly: 28 },
        baseUsers: 3,
        features: [
            "Includes all features of the Plus plan.",
            "Minimum 3 users",
            "Shared Data & Analysis History",
            "Centralized Billing"
        ],
        cta: "Choose Team Plus",
        highlight: false,
        perUser: true,
        includedModes: ['Explore']
    },
    {
        title: "Team Pro",
        type: 'Team',
        icon: Building,
        description: "Full suite for teams.",
        price: { monthly: 69, yearly: 55 },
        baseUsers: 3,
        features: [
            "Includes all features of the Pro plan.",
            "Minimum 3 users",
            "Shared Data & Analysis History",
            "Collaborative Workspaces"
        ],
        cta: "Choose Team Pro",
        highlight: true,
        perUser: true,
        includedModes: ['Explore', 'Model', 'Strategic Decision']
    }
];

// Explore Mode Categories (Plus)
const exploreCategories = [
    {
        name: 'Descriptive',
        icon: BarChart3,
        items: [
            { id: 'descriptive-stats', label: 'Descriptive Statistics', plan: 'free' },
            { id: 'frequency-analysis', label: 'Frequency Analysis', plan: 'free' },
            { id: 'variability-analysis', label: 'Variability Analysis', plan: 'plus' },
        ]
    },
    {
        name: 'Assumptions',
        icon: ShieldCheck,
        items: [
            { id: 'normality-test', label: 'Normality Test', plan: 'free' },
            { id: 'homogeneity-test', label: 'Homogeneity of Variance', plan: 'plus' },
            { id: 'outlier-detection', label: 'Outlier Detection', plan: 'plus' },
            { id: 'linearity-check', label: 'Linearity Check', plan: 'plus' },
        ]
    },
    {
        name: 'Comparison',
        icon: Users,
        items: [
            { id: 'one-sample-ttest', label: 'One-Sample T-Test', plan: 'plus' },
            { id: 'independent-samples-ttest', label: 'Independent Samples T-Test', plan: 'plus' },
            { id: 'one-way-anova', label: 'One-Way ANOVA', plan: 'plus' },
            { id: 'two-way-anova', label: 'Two-Way ANOVA', plan: 'plus' },
            { id: 'mann-whitney', label: 'Mann-Whitney U Test', plan: 'plus' },
            { id: 'kruskal-wallis', label: 'Kruskal-Wallis H-Test', plan: 'plus' },
        ]
    },
    {
        name: 'Relationship',
        icon: TrendingUp,
        items: [
            { id: 'correlation', label: 'Correlation Analysis', plan: 'plus' },
            { id: 'regression-simple', label: 'Simple Linear Regression', plan: 'plus' },
            { id: 'regression-multiple', label: 'Multiple Linear Regression', plan: 'plus' },
            { id: 'logistic-regression', label: 'Logistic Regression', plan: 'plus' },
        ]
    },
    {
        name: 'Econometrics',
        icon: Landmark,
        items: [
            { id: 'did', label: 'Difference-in-Differences (DID)', plan: 'plus' },
            { id: 'psm', label: 'Propensity Score Matching (PSM)', plan: 'plus' },
            { id: 'rdd', label: 'Regression Discontinuity (RDD)', plan: 'plus' },
            { id: 'iv', label: 'Instrumental Variables (IV)', plan: 'plus' },
        ]
    },
];

// Model Mode Categories (Pro)
const modelCategories = [
    {
        name: 'Predictive',
        icon: Brain,
        items: [
            { id: 'decision-tree', label: 'Decision Tree', plan: 'pro' },
            { id: 'random-forest', label: 'Random Forest', plan: 'pro' },
            { id: 'xgboost', label: 'XGBoost', plan: 'pro' },
            { id: 'svm', label: 'Support Vector Machine (SVM)', plan: 'pro' },
            { id: 'knn', label: 'K-Nearest Neighbors (KNN)', plan: 'pro' },
            { id: 'naive-bayes', label: 'Naive Bayes', plan: 'pro' },
        ]
    },
    {
        name: 'Clustering',
        icon: Layers,
        items: [
            { id: 'kmeans', label: 'K-Means Clustering', plan: 'pro' },
            { id: 'dbscan', label: 'DBSCAN', plan: 'pro' },
            { id: 'hdbscan', label: 'HDBSCAN', plan: 'pro' },
            { id: 'gmm', label: 'Gaussian Mixture Model (GMM)', plan: 'pro' },
            { id: 'hca', label: 'Hierarchical Clustering (HCA)', plan: 'pro' },
        ]
    },
    {
        name: 'Time Series',
        icon: Timer,
        items: [
            { id: 'trend-analysis', label: 'Trend Analysis', plan: 'pro' },
            { id: 'seasonal-decomposition', label: 'Seasonal Decomposition', plan: 'pro' },
            { id: 'arima', label: 'ARIMA / SARIMAX', plan: 'pro' },
            { id: 'exponential-smoothing', label: 'Exponential Smoothing', plan: 'pro' },
        ]
    },
    {
        name: 'Structural',
        icon: GitBranch,
        items: [
            { id: 'efa', label: 'Exploratory Factor Analysis (EFA)', plan: 'pro' },
            { id: 'cfa', label: 'Confirmatory Factor Analysis (CFA)', plan: 'pro' },
            { id: 'pca', label: 'Principal Component Analysis (PCA)', plan: 'pro' },
            { id: 'sem', label: 'Structural Equation Modeling (SEM)', plan: 'pro' },
            { id: 'mediation', label: 'Mediation Analysis', plan: 'pro' },
        ]
    },
];

// Strategic Decision Categories (Pro)
const strategicCategories = [
    {
        name: 'Optimization',
        icon: Target,
        items: [
            { id: 'linear-programming', label: 'Linear Programming', plan: 'pro' },
            { id: 'goal-programming', label: 'Goal Programming', plan: 'pro' },
            { id: 'integer-programming', label: 'Integer Programming', plan: 'pro' },
        ]
    },
    {
        name: 'Resource Allocation',
        icon: Route,
        items: [
            { id: 'transportation', label: 'Transportation Model', plan: 'pro' },
            { id: 'assignment', label: 'Assignment Model', plan: 'pro' },
            { id: 'network-flow', label: 'Network Flow Analysis', plan: 'pro' },
        ]
    },
    {
        name: 'Multi-Criteria Decision',
        icon: Gauge,
        items: [
            { id: 'ahp', label: 'Analytic Hierarchy Process (AHP)', plan: 'pro' },
            { id: 'topsis', label: 'TOPSIS', plan: 'pro' },
            { id: 'electre', label: 'ELECTRE', plan: 'pro' },
        ]
    },
    {
        name: 'Simulation',
        icon: Workflow,
        items: [
            { id: 'monte-carlo', label: 'Monte Carlo Simulation', plan: 'pro' },
            { id: 'what-if', label: 'What-if Analysis', plan: 'pro' },
            { id: 'scenario-planning', label: 'Scenario Planning', plan: 'pro' },
        ]
    },
];

const Checkmark = () => <Check className="mx-auto text-green-500" />;
const EyeIcon = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button>
          <Eye className="mx-auto text-gray-400 cursor-pointer"/>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>View results with example data</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const PlanFeatures = () => (
    <div className="flex justify-center items-center gap-1.5">
        <Check className="text-green-500 w-5 h-5" />
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button>
                        <Code className="h-4 w-4 text-muted-foreground" />
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Code Download</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Report Download</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </div>
);

const FeatureComparisonTable = ({ categories, title, subtitle }: { categories: typeof exploreCategories, title: string, subtitle?: string }) => {
  return (
    <section className="py-12 md:py-20 lg:py-24 bg-slate-100 dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">{title}</h2>
          {subtitle && (
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>
        <Card>
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead className="w-[40%] font-semibold text-base">Feature</TableHead>
                      <TableHead className="text-center font-semibold text-base">Free</TableHead>
                      <TableHead className="text-center font-semibold text-base">Plus</TableHead>
                      <TableHead className="text-center font-semibold text-base">Pro</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {categories.map(category => (
                      <React.Fragment key={category.name}>
                          <TableRow className="bg-muted/50">
                              <TableCell colSpan={4} className="font-bold text-primary">
                                  <div className="flex items-center gap-2">
                                      <category.icon className="w-5 h-5"/>
                                      {category.name}
                                  </div>
                              </TableCell>
                          </TableRow>
                          {category.items.map(item => {
                              const isFree = item.plan === 'free';
                              const isPlus = item.plan === 'free' || item.plan === 'plus';
                              const isPro = true;

                              return (
                                  <TableRow key={item.id}>
                                      <TableCell>{item.label}</TableCell>
                                      <TableCell className="text-center">
                                          {isFree ? <Checkmark /> : <EyeIcon />}
                                      </TableCell>
                                      <TableCell className="text-center">{isPlus ? <PlanFeatures /> : <EyeIcon />}</TableCell>
                                      <TableCell className="text-center">{isPro ? <PlanFeatures /> : '–'}</TableCell>
                                  </TableRow>
                              );
                          })}
                      </React.Fragment>
                  ))}
              </TableBody>
          </Table>
        </Card>
      </div>
    </section>
  );
}

const PricingSection: React.FC = () => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [activePlanType, setActivePlanType] = useState<'Individual' | 'Team'>('Individual');

    const filteredPlans = useMemo(() => {
        return plans.filter(plan => plan.type === activePlanType);
    }, [activePlanType]);

    return (
        <>
            <section className="py-12 md:py-20 lg:py-24 bg-gradient-to-b from-slate-50 to-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Find the Right Plan for You</h1>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                            Start for free, then upgrade to unlock powerful features for professional-grade analysis and decision-making.
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-6 mb-10">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Tabs value={activePlanType} onValueChange={(v) => setActivePlanType(v as any)} className="w-full sm:w-auto">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="Individual">Individual</TabsTrigger>
                                    <TabsTrigger value="Team">Team</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <div className="flex items-center space-x-2">
                                <Label htmlFor="billing-cycle" className={cn(billingCycle === 'monthly' ? 'text-primary' : 'text-muted-foreground')}>
                                    Monthly
                                </Label>
                                <Switch
                                    id="billing-cycle"
                                    checked={billingCycle === 'yearly'}
                                    onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
                                />
                                <Label htmlFor="billing-cycle" className={cn(billingCycle === 'yearly' ? 'text-primary' : 'text-muted-foreground')}>
                                    Yearly <span className="text-green-500 font-semibold">(Save 20%)</span>
                                </Label>
                            </div>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activePlanType}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 justify-center"
                        >
                            {filteredPlans.map((plan) => {
                                const price = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly;
                                const monthlyPrice = plan.price.monthly;
                                const yearlyPrice = price * (plan.baseUsers || 1) * 12;
                                const yearlySavings = (monthlyPrice * (plan.baseUsers || 1) * 12) - yearlyPrice;

                                const period = plan.perUser ? '/user/month' : '/month';
                                const PlanIcon = plan.icon;

                                return (
                                    <Card key={plan.title} className={cn("flex flex-col shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative", plan.highlight && "border-2 border-primary ring-4 ring-primary/10")}>
                                        {plan.highlight && <div className="absolute top-0 right-4 -mt-3 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>}
                                        <CardHeader className="text-center pb-4">
                                            <div className="flex justify-center mb-4">
                                                <div className="p-3 bg-muted rounded-lg"><PlanIcon className="w-6 h-6 text-primary"/></div>
                                            </div>
                                            <CardTitle className="text-2xl font-bold mb-2">{plan.title}</CardTitle>
                                            <CardDescription>{plan.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-1 flex flex-col justify-between">
                                            <div className="text-center mb-8">
                                                <AnimatePresence mode="wait">
                                                    <motion.div key={billingCycle} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
                                                        {price > 0 ? (
                                                            <>
                                                                <div className="flex justify-center items-baseline">
                                                                    <span className="text-4xl font-extrabold tracking-tight">${price}</span>
                                                                    <span className="ml-1 text-xl font-medium text-muted-foreground">{period}</span>
                                                                </div>
                                                                 {billingCycle === 'yearly' && monthlyPrice > 0 && yearlySavings > 0 && (
                                                                    <p className="text-xs text-green-600 font-semibold mt-1">
                                                                        Billed as ${yearlyPrice.toFixed(0)} annually. Save ${yearlySavings.toFixed(0)}.
                                                                    </p>
                                                                )}
                                                                {plan.baseUsers && (
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        Starts with {plan.baseUsers} users.
                                                                    </p>
                                                                )}
                                                            </>
                                                        ) : price === 0 ? (
                                                            <span className="text-4xl font-extrabold">Free</span>
                                                        ) : (
                                                            <span className="text-3xl font-bold">Contact Us</span>
                                                        )}
                                                    </motion.div>
                                                </AnimatePresence>
                                            </div>
                                            
                                            {/* Included Modes Badges */}
                                            <div className="flex flex-wrap justify-center gap-2 mb-6">
                                                {plan.includedModes.map((mode) => (
                                                    <span 
                                                        key={mode} 
                                                        className={cn(
                                                            "text-xs font-medium px-2.5 py-1 rounded-full",
                                                            mode === 'Basic' && "bg-gray-100 text-gray-600",
                                                            mode === 'Explore' && "bg-blue-100 text-blue-700",
                                                            mode === 'Model' && "bg-violet-100 text-violet-700",
                                                            mode === 'Strategic Decision' && "bg-amber-100 text-amber-700"
                                                        )}
                                                    >
                                                        {mode}
                                                    </span>
                                                ))}
                                            </div>

                                            <div>
                                                <h3 className="font-semibold mb-4 text-center">What's Included:</h3>
                                                <ul className="space-y-3 text-sm text-gray-700">
                                                    {plan.features.map((feature, i) => (
                                                        <li key={i} className="flex items-start">
                                                            <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="mt-8">
                                            <Button asChild className={cn("w-full text-lg py-6", plan.highlight && "bg-primary hover:bg-primary/90")}>
                                                <Link href="/register">{plan.cta}<ArrowRight className="ml-2 h-5 w-5" /></Link>
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                )
                            })}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </section>

            {/* Explore Mode Features (Plus) */}
            <FeatureComparisonTable 
                categories={exploreCategories} 
                title="Explore Mode Features"
                subtitle="Included in Plus plan and above. Data exploration, hypothesis testing, and econometrics."
            />

            {/* Model Mode Features (Pro) */}
            <FeatureComparisonTable 
                categories={modelCategories} 
                title="Model Mode Features"
                subtitle="Included in Pro plan only. Predictive modeling, clustering, and advanced analytics."
            />

            {/* Strategic Decision Features (Pro) */}
            <FeatureComparisonTable 
                categories={strategicCategories} 
                title="Strategic Decision Features"
                subtitle="Included in Pro plan only. Optimization, resource allocation, and simulation tools."
            />
        </>
    );
};

export default PricingSection;

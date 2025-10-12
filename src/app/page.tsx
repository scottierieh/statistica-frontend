
'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, BarChart2, CheckCircle, ClipboardList, Cpu, MoveRight, Users, TrendingUp, Link2, GitBranch, Network, Layers, Map, ScanSearch, Atom, MessagesSquare, Share2, GitCommit, DollarSign, ThumbsUp, FlaskConical, LineChart, Target, Calculator, Handshake, Palette, FileUp, Database, BrainCircuit, Activity, ZoomIn, HeartPulse } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const features = {
    stats: [
      { icon: BarChart2, text: 'Descriptive Statistics' },
      { icon: TrendingUp, text: 'Advanced Regression Models' },
      { icon: Users, text: 'ANOVA & T-Tests' },
      { icon: Link2, text: 'Correlation & Partial Correlation' },
      { icon: GitBranch, text: 'Mediation & Moderation' },
      { icon: Cpu, text: 'Factor Analysis (EFA, CFA)' },
      { icon: Layers, text: 'MANOVA & ANCOVA' },
      { icon: LineChart, text: 'Time Series Forecasting' },
      { icon: Network, text: 'Social Network Analysis (SNA)' },
      { icon: BrainCircuit, text: 'Clustering (K-Means, DBSCAN)'},
      { icon: HeartPulse, text: 'Survival Analysis'},
      { icon: Target, text: 'And 30+ more...' },
    ],
    surveys: [
      { icon: Target, text: 'Importance-Performance Analysis' },
      { icon: Handshake, text: 'Conjoint & CBC Analysis' },
      { icon: ThumbsUp, text: 'MaxDiff Scaling' },
      { icon: Share2, text: 'Net Promoter Score (NPS)' },
      { icon: DollarSign, text: 'Price Sensitivity Meter (PSM)' },
      { icon: ClipboardList, text: 'Customer Satisfaction (CSAT)' },
    ]
  };

  const carouselItems = [
    {
        title: "Advanced Statistical Analysis",
        description: "From T-Tests to Structural Equation Modeling, run over 40 complex statistical analyses with a simple interface. Get results and AI-powered interpretations in seconds.",
        image: PlaceHolderImages.find(img => img.id === "hero-image"),
        gradient: "from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-950/30",
        textColor: "text-blue-900 dark:text-blue-100",
        buttonHref: "/dashboard/statistica"
    },
    {
        title: "Purpose-Built Survey Tools",
        description: "Design and deploy specialized market research surveys like Conjoint, TURF, and Van Westendorp. Go from data collection to advanced analysis seamlessly.",
        image: PlaceHolderImages.find(img => img.id === "market-research-banner"),
        gradient: "from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-950/30",
        textColor: "text-purple-900 dark:text-purple-100",
        buttonHref: "/dashboard/survey2"
    },
    {
        title: "Integrated AI-Powered Workflow",
        description: "Leverage AI at every step. Get smart recommendations for analysis, automated interpretation of results, and clear, actionable insights to drive your decisions.",
        image: PlaceHolderImages.find(img => img.id === "enterprise-feature"),
        gradient: "from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-950/30",
        textColor: "text-emerald-900 dark:text-emerald-100",
        buttonHref: "/dashboard"
    }
  ];

  const securityImage = PlaceHolderImages.find(img => img.id === 'security-feature');
  const enterpriseImage = PlaceHolderImages.find(img => img.id === 'enterprise-feature');
  
  const autoplayPlugin = React.useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
       <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 dark:bg-slate-950/80 dark:border-slate-800">
        <div className="w-full max-w-6xl mx-auto flex items-center">
            <div className="flex-1 flex justify-start">
                 <Link href="/" className="flex items-center justify-center gap-2">
                    <Calculator className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-headline font-bold">Skarii</h1>
                </Link>
            </div>
            <nav className="hidden md:flex items-center gap-4 sm:gap-6">
                <Link className="text-sm font-medium hover:underline underline-offset-4" href="#features">Features</Link>
                <Link className="text-sm font-medium hover:underline underline-offset-4" href="/pricing">Pricing</Link>
                <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">About</Link>
            </nav>
            <div className="flex-1 flex justify-end items-center gap-4">
                <Button variant="ghost" asChild><Link href="/login">Login</Link></Button>
                <Button asChild><Link href="/register">Sign Up</Link></Button>
            </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative w-full py-20 md:py-32 lg:py-40 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20">
           <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(to_bottom,white_10%,transparent_90%)] dark:bg-grid-slate-900"></div>
          <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none font-headline">
                  From Raw Data to Clear Insight
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  An intelligent platform for both complex statistical analysis and powerful survey creation. Your all-in-one solution for data-driven decisions.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="h-12 px-8 text-base">
                  <Link href="/dashboard/statistica">Explore Statistical Analysis</Link>
                </Button>
                 <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
                  <Link href="/dashboard/survey2">Create a Survey</Link>
                </Button>
              </div>
               
                <div className="mt-12 w-full max-w-5xl">
                    <Carousel
                        plugins={[autoplayPlugin.current]}
                        className="w-full"
                        opts={{ loop: true }}
                    >
                        <CarouselContent>
                            {carouselItems.map((item, index) => (
                                <CarouselItem key={index}>
                                    <div className={cn("p-8 md:p-12 rounded-2xl flex items-center justify-between bg-gradient-to-r shadow-2xl border", item.gradient, "dark:border-slate-800")}>
                                        <div className="flex-1 space-y-4">
                                            <h2 className={cn("text-3xl md:text-4xl font-bold font-headline", item.textColor)}>{item.title}</h2>
                                            <p className={cn("text-base md:text-lg opacity-90 max-w-lg", item.textColor)}>{item.description}</p>
                                            <Link href={item.buttonHref}>
                                                <Button className={cn("mt-4 transition-transform hover:scale-105")}>Learn More <ArrowRight className="ml-2 w-4 h-4"/></Button>
                                            </Link>
                                        </div>
                                        {item.image && (
                                            <Image
                                                src={item.image.imageUrl}
                                                alt={item.image.description}
                                                width={280}
                                                height={280}
                                                className="hidden lg:block w-72 h-72 object-cover rounded-xl shadow-lg"
                                                data-ai-hint={item.image.imageHint}
                                            />
                                        )}
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="w-full max-w-6xl mx-auto px-4 md:px-6 space-y-20">
            {securityImage && (
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold font-headline tracking-tight sm:text-4xl">Powerful Analysis, Made Simple</h2>
                  <p className="text-muted-foreground text-lg">
                    Statistica is a comprehensive statistical analysis tool that simplifies complex data analysis. Upload your data, select your analysis, and get results in seconds.
                  </p>
                  <p className="text-muted-foreground">
                   Go beyond numbers with AI-generated interpretations, APA-style reports, and actionable recommendations. Our extensive toolkit includes over 40 analyses, from basic descriptive statistics to advanced structural equation modeling, ensuring you have the right tool for any research question.
                  </p>
                </div>
                <div className="md:order-1 flex justify-center">
                   <Image 
                      src={securityImage.imageUrl}
                      alt={securityImage.description}
                      width={600}
                      height={500}
                      className="rounded-xl shadow-lg"
                      data-ai-hint={securityImage.imageHint}
                    />
                </div>
              </div>
            )}
             {enterpriseImage && (
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="md:order-2 flex justify-center">
                   <Image 
                      src={enterpriseImage.imageUrl}
                      alt={enterpriseImage.description}
                      width={600}
                      height={500}
                      className="rounded-xl shadow-lg"
                      data-ai-hint={enterpriseImage.imageHint}
                    />
                </div>
                <div className="space-y-4 md:order-1">
                  <h2 className="text-3xl font-bold font-headline tracking-tight sm:text-4xl">Comprehensive Survey Platform</h2>
                   <p className="text-muted-foreground text-lg">
                    From simple polls to advanced market research, build, distribute, and analyze surveys—all in one place.
                  </p>
                  <p className="text-muted-foreground">
                    Leverage a seamless workflow that takes you from question design to insightful analysis without switching tools. Customize themes, colors, and layouts to match your brand, and use specialized templates for complex studies like Conjoint, TURF, and Importance-Performance Analysis (IPA).
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
        
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-slate-900">
          <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary font-medium">Your All-in-One Data Platform</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">One Tool, Endless Possibilities</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Whether you're testing a hypothesis, segmenting a market, or gathering feedback, Skarii provides the right tools for the job.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-shadow flex flex-col">
                <CardHeader className="bg-muted/50 p-6">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg text-primary"><BarChart2 className="w-8 h-8"/></div>
                      <div>
                          <CardTitle className="font-headline text-2xl">Statistical Analysis</CardTitle>
                          <CardDescription>From data to decision with a comprehensive statistical toolkit.</CardDescription>
                      </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="space-y-4 mb-6">
                      <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><FileUp className="w-5 h-5"/></div>
                          <div>
                              <h4 className="font-semibold">Intuitive & Powerful</h4>
                              <p className="text-sm text-muted-foreground">Upload data via CSV/Excel or use example datasets. Get complex analyses with one click.</p>
                          </div>
                      </div>
                      <div className="flex items-start gap-4">
                           <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><BrainCircuit className="w-5 h-5"/></div>
                           <div>
                              <h4 className="font-semibold">AI-Powered Insights</h4>
                              <p className="text-sm text-muted-foreground">Go beyond numbers with AI-generated interpretations, APA-style reports, and actionable recommendations.</p>
                          </div>
                      </div>
                  </div>

                  <div className="flex-1">
                      <h4 className="font-semibold text-center mb-4">Extensive Toolkit: Over 40 Analyses</h4>
                      <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {features.stats.map((feature, i) => (
                           <li key={i} className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="w-4 h-4 text-primary"/><span>{feature.text}</span></li>
                        ))}
                      </ul>
                  </div>
                </CardContent>
              </Card>

               <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-shadow flex flex-col">
                <CardHeader className="bg-muted/50 p-6">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg text-primary"><ClipboardList className="w-8 h-8"/></div>
                      <div>
                          <CardTitle className="font-headline text-2xl">Survey & Feedback Platform</CardTitle>
                          <CardDescription>Build, distribute, and analyze surveys with purpose-built tools.</CardDescription>
                      </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col">
                   <div className="space-y-4 mb-6">
                      <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Activity className="w-5 h-5"/></div>
                          <div>
                              <h4 className="font-semibold">Integrated Workflow</h4>
                              <p className="text-sm text-muted-foreground">Design your survey, collect responses, and analyze the results all within a single, seamless interface.</p>
                          </div>
                      </div>
                      <div className="flex items-start gap-4">
                           <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Palette className="w-5 h-5"/></div>
                           <div>
                              <h4 className="font-semibold">Effortless Customization</h4>
                              <p className="text-sm text-muted-foreground">Tailor the look and feel of your surveys with customizable themes, colors, fonts, and layouts to match your brand.</p>
                          </div>
                      </div>
                  </div>

                   <div className="flex-1">
                      <h4 className="font-semibold text-center mb-4">Purpose-Built Analysis Templates</h4>
                      <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {features.surveys.map((feature, i) => (
                           <li key={i} className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="w-4 h-4 text-primary"/><span>{feature.text}</span></li>
                        ))}
                      </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        <section id="pricing-cta" className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
           <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
             <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Easy to Start, Powerful to Use</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our intuitive interface makes complex analysis accessible to everyone, without sacrificing the power and flexibility that experts demand.
                </p>
                <Button asChild size="lg" className="h-12 px-8 text-base">
                  <Link href="/dashboard">Explore the Dashboard <MoveRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>
          </div>
        </section>

      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-muted/40 dark:bg-slate-900/50 dark:border-slate-800">
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

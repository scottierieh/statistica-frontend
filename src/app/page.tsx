
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, BarChart2, CheckCircle, ClipboardList, Cpu, MoveRight, Users, TrendingUp, Link2, GitBranch, Network, Layers, Map, ScanSearch, Atom, MessagesSquare, Share2, GitCommit, DollarSign, ThumbsUp, FlaskConical, LineChart, Target, Calculator, Handshake } from 'lucide-react';
import Link from 'next/link';

const features = {
  stats: [
    { icon: BarChart2, text: 'Descriptive Statistics' },
    { icon: TrendingUp, text: 'Regression Analysis' },
    { icon: Users, text: 'ANOVA & T-Tests' },
    { icon: Link2, text: 'Correlation Analysis' },
    { icon: GitBranch, text: 'Mediation & Moderation' },
    { icon: Cpu, text: 'Factor Analysis (EFA, CFA)' },
    { icon: Layers, text: 'MANOVA & ANCOVA' },
    { icon: LineChart, text: 'Time Series Analysis' },
    { icon: Network, text: 'Social Network Analysis' },
  ],
  surveys: [
    { icon: Target, text: 'Importance-Performance (IPA)' },
    { icon: Handshake, text: 'Conjoint Analysis' },
    { icon: ThumbsUp, text: 'MaxDiff Scaling' },
    { icon: Share2, text: 'Net Promoter Score (NPS)' },
    { icon: DollarSign, text: 'Price Sensitivity (PSM)' },
    { icon: ClipboardList, text: 'Customer Satisfaction (CSAT)' },
  ]
}

export default function LandingPage() {
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
            <nav className="flex items-center gap-4 sm:gap-6">
                <Link className="text-sm font-medium hover:underline underline-offset-4" href="#features">Features</Link>
                <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">Pricing</Link>
                <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">About</Link>
            </nav>
            <div className="flex-1 flex justify-end items-center gap-4">
                <Button variant="ghost" asChild><Link href="/login">Login</Link></Button>
                <Button asChild><Link href="/register">Sign Up</Link></Button>
            </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative w-full py-20 md:py-32 lg:py-40 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
           <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(to_bottom,white_10%,transparent_90%)]"></div>
          <div className="container relative px-4 md:px-6">
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
            </div>
          </div>
        </section>
        
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary font-medium">Your All-in-One Data Platform</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">One Tool, Endless Possibilities</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Whether you're testing a hypothesis, segmenting a market, or gathering feedback, Skarii provides the right tools for the job.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
                <CardHeader className="bg-muted/50 p-6">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg text-primary"><BarChart2 className="w-8 h-8"/></div>
                      <div>
                          <CardTitle className="font-headline text-2xl">Statistical Analysis</CardTitle>
                          <CardDescription>From basic summaries to advanced modeling.</CardDescription>
                      </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {features.stats.map((feature, i) => (
                       <li key={i} className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="w-4 h-4 text-primary"/><span>{feature.text}</span></li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

               <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
                <CardHeader className="bg-muted/50 p-6">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg text-primary"><ClipboardList className="w-8 h-8"/></div>
                      <div>
                          <CardTitle className="font-headline text-2xl">Survey & Feedback</CardTitle>
                          <CardDescription>Build, distribute, and analyze surveys with purpose-built tools.</CardDescription>
                      </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {features.surveys.map((feature, i) => (
                       <li key={i} className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="w-4 h-4 text-primary"/><span>{feature.text}</span></li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
           <div className="container px-4 md:px-6">
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

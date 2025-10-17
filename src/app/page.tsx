
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart, BrainCircuit, Check, ClipboardList, Database, DollarSign, FastForward, LineChart, Calculator } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from 'lucide-react';


const heroImage = PlaceHolderImages.find(p => p.id === 'hero-image');
const securityImage = PlaceHolderImages.find(p => p.id === 'security-feature');
const enterpriseImage = PlaceHolderImages.find(p => p.id === 'enterprise-feature');

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
            <nav className="hidden lg:flex gap-4 sm:gap-6 flex-1 justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-sm font-medium">
                      Features <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <Link href="/features/statistica">Statistica</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/features/survey">Survey</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Link className="text-sm font-medium hover:underline underline-offset-4" href="/pricing">Pricing</Link>
                <Link className="text-sm font-medium hover:underline underline-offset-4" href="#testimonials">Testimonials</Link>
                <Link className="text-sm font-medium hover:underline underline-offset-4" href="/faq">FAQ</Link>
            </nav>
            <div className="flex-1 flex justify-end">
                <Button asChild><Link href="/login">Get Started</Link></Button>
            </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 text-center bg-gradient-to-b from-white to-slate-100">
            {heroImage && (
                <div className="absolute inset-0">
                    <Image
                      src={heroImage.imageUrl}
                      alt={heroImage.description}
                      layout="fill"
                      objectFit="cover"
                      className="opacity-10"
                      data-ai-hint={heroImage.imageHint}
                      priority
                    />
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-100 via-slate-100/80 to-transparent"></div>
                </div>
            )}
            <div className="container mx-auto px-4 relative">
                 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <h1 className="text-4xl md:text-6xl font-extrabold font-headline tracking-tighter mb-6">
                        From Data to Decision, <span className="text-primary">Instantly</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10">
                        Our intelligent platform automates complex statistical analysis, generates insightful visualizations, and delivers clear, actionable reports.
                    </p>
                    <div className="flex justify-center items-center gap-4">
                        <Button size="lg" asChild className="text-lg py-7 px-8 shadow-lg shadow-primary/30">
                            <Link href="/dashboard">Try For Free <ArrowRight className="ml-2 w-5 h-5"/></Link>
                        </Button>
                         <Button size="lg" variant="outline" asChild className="text-lg py-7 px-8">
                            <Link href="/pricing">View Pricing</Link>
                        </Button>
                    </div>
                </motion.div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 lg:py-24 bg-white">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-bold text-center font-headline mb-12">All-in-One Analysis Toolkit</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={ClipboardList}
                        title="Survey Suite"
                        description="Design, distribute, and analyze surveys with integrated tools for conjoint, TURF, and more."
                    />
                     <FeatureCard
                        icon={BrainCircuit}
                        title="Advanced Statistics"
                        description="Perform over 40 statistical analyses, from t-tests to structural equation modeling."
                    />
                    <FeatureCard
                        icon={LineChart}
                        title="AI-Powered Insights"
                        description="Get automated APA-style reports and actionable recommendations from your data."
                    />
                </div>
            </div>
        </section>

        {/* Security / Enterprise Section */}
        <section className="py-20 lg:py-24 bg-slate-100">
             <div className="container mx-auto px-4">
                 <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-center">
                    <div className="space-y-6">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Built for Teams, Ready for Enterprise</h2>
                        <p className="text-muted-foreground text-lg">
                            Collaborate seamlessly, manage data securely, and integrate with your existing workflow. Our platform is designed for scalability and reliability.
                        </p>
                        <ul className="space-y-4">
                             <li className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold">Team Workspaces</h4>
                                    <p className="text-muted-foreground text-sm">Share datasets, analyses, and reports with your team members in a collaborative environment.</p>
                                </div>
                            </li>
                             <li className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold">Enterprise-Grade Security</h4>
                                    <p className="text-muted-foreground text-sm">Data encryption at rest and in transit, with SOC 2 Type II and ISO 27001 compliance.</p>
                                </div>
                            </li>
                             <li className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold">API & Integrations</h4>
                                    <p className="text-muted-foreground text-sm">Connect with your favorite tools and automate your data pipeline with our flexible API.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div>
                        {enterpriseImage && 
                            <Image 
                                src={enterpriseImage.imageUrl}
                                alt={enterpriseImage.description}
                                width={600}
                                height={500}
                                className="rounded-xl shadow-2xl"
                                data-ai-hint={enterpriseImage.imageHint}
                            />
                        }
                    </div>
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

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
    <div className="p-6 rounded-xl bg-white shadow-lg border border-transparent hover:border-primary/20 hover:shadow-primary/10 transition-all">
        <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-lg">
                <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm">{description}</p>
            </div>
        </div>
    </div>
);

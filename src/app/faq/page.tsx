
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calculator, ArrowLeft, LifeBuoy, CreditCard, UserCircle, BrainCircuit, Wrench, MessageSquare, Search, BookOpen, BarChart } from 'lucide-react';
import Link from 'next/link';

const helpCategories = [
    {
        icon: BookOpen,
        title: "Getting Started",
        description: "How it works, uploading data, creating surveys."
    },
    {
        icon: BrainCircuit,
        title: "Statistical Analysis",
        description: "Interpreting results, choosing tests, assumptions."
    },
    {
        icon: BarChart,
        title: "Survey & Features",
        description: "Question types, advanced analysis, distribution."
    },
    {
        icon: UserCircle,
        title: "Account",
        description: "Settings, security, profile management."
    },
    {
        icon: CreditCard,
        title: "Plans & Billing",
        description: "Pricing, invoices, payment options, refunds."
    },
    {
        icon: Wrench,
        title: "Technical Issues",
        description: "Troubleshooting, error messages, performance."
    },
    {
        icon: MessageSquare,
        title: "Contact Support",
        description: "Get help from our support team, provide feedback."
    },
];


export default function FaqPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 dark:bg-slate-950/80 dark:border-slate-800">
        <div className="w-full max-w-6xl mx-auto flex items-center">
            <div className="flex-1 flex justify-start items-center gap-4">
                <Button variant="outline" asChild><Link href="/"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Home</Link></Button>
            </div>
             <Link href="/" className="flex items-center justify-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-headline font-bold">Skarii Help Center</h1>
            </Link>
            <div className="flex-1 flex justify-end items-center gap-4">
                <Button variant="ghost" asChild><Link href="/login">Log In</Link></Button>
            </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <Card className="bg-slate-800 dark:bg-slate-900 text-white shadow-2xl overflow-hidden mb-16">
            <div className="grid md:grid-cols-2">
                <div className="p-8 md:p-10 flex flex-col justify-center">
                    <h1 className="text-4xl font-bold font-headline mb-2">Find solutions fast.</h1>
                    <p className="text-slate-300 mb-6">Search hundreds of articles on Skarii Help.</p>
                    <div className="relative">
                        <Input 
                            placeholder="Search articles" 
                            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 h-12 pl-10 rounded-full"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                        <Button size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full w-10 h-10 bg-primary">
                            <Search className="w-5 h-5"/>
                        </Button>
                    </div>
                     <div className="mt-4 flex items-center gap-2 text-sm">
                        <span className="text-slate-300">Popular:</span>
                        <Button variant="secondary" size="sm" className="rounded-full bg-slate-700 hover:bg-slate-600">correlation</Button>
                        <Button variant="secondary" size="sm" className="rounded-full bg-slate-700 hover:bg-slate-600">conjoint</Button>
                        <Button variant="secondary" size="sm" className="rounded-full bg-slate-700 hover:bg-slate-600">billing</Button>
                    </div>
                </div>
                <div className="hidden md:flex items-center justify-center p-8 bg-slate-700/50">
                    <LifeBuoy className="w-32 h-32 text-primary opacity-20"/>
                </div>
            </div>
        </Card>
        
        <div className="mb-10">
            <h2 className="text-2xl font-bold text-center mb-6">Choose a category to find what you need</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {helpCategories.map((category) => (
                <Card key={category.title} className="group hover:shadow-lg hover:-translate-y-1 transition-transform duration-300">
                    <CardContent className="p-6 text-center">
                         <div className="inline-block p-4 bg-muted rounded-xl mb-4 group-hover:bg-primary/10 transition-colors">
                            <category.icon className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg">{category.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
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

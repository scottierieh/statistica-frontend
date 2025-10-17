
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Calculator, ArrowLeft, LifeBuoy } from 'lucide-react';
import Link from 'next/link';

const faqItems = [
    {
        question: "Is Skarii suitable for academic research?",
        answer: "Yes! Skarii provides a comprehensive suite of statistical tools suitable for academic research, complete with APA-style reporting and robust data handling."
    },
    {
        question: "What kind of data can I upload?",
        answer: "You can upload data in various formats, including CSV, TSV, and Excel (.xls, .xlsx). The platform is designed to automatically parse your data and identify variable types."
    },
    {
        question: "How does the AI interpretation work?",
        answer: "Our AI models analyze the statistical output of your analysis, identify significant findings, and translate them into human-readable text, following established reporting standards."
    },
    {
        question: "Can I customize the surveys with my own branding?",
        answer: "Absolutely. The Survey tool includes a design panel that allows you to customize colors, fonts, spacing, and more to match your brand identity."
    },
    {
        question: "Is my data secure?",
        answer: "Data security is our top priority. We use industry-standard encryption for data in transit and at rest. Your data is processed securely and is not used for training AI models without your explicit consent."
    },
    {
        question: "What's the difference between a Standard and a Pro license?",
        answer: "The Standard license provides access to all our core statistical and survey tools. The Pro license is designed for power users and includes advanced features like API access, team collaboration, and priority support."
    }
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
                <h1 className="text-xl font-headline font-bold">Skarii</h1>
            </Link>
            <div className="flex-1 flex justify-end items-center gap-4">
                {/* This div is to balance the flex layout */}
            </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-20 lg:py-24">
        <div className="text-center mb-12">
            <div className="inline-block p-4 bg-primary/10 rounded-xl mb-4">
                <LifeBuoy className="w-10 h-10 text-primary"/>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Frequently Asked Questions</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Find answers to common questions about Skarii's features, pricing, and security.
            </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={`item-${index}`} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-semibold text-lg">{item.question}</AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground pt-2">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      </main>

       <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-muted/40 dark:bg-slate-900/50 dark:border-slate-800">
        <p className="text-xs text-muted-foreground">
          &copy; 2024 Skarii. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="/#">Terms of Service</Link>
          <Link className="text-xs hover:underline underline-offset-4" href="/#">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}

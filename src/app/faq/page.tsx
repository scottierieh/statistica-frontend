
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calculator, ArrowLeft, LifeBuoy, CreditCard, UserCircle, BrainCircuit, Wrench, MessageSquare, Search, BookOpen, BarChart, Globe } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { faqData } from '@/lib/faq-data';

const helpCenterBg = PlaceHolderImages.find(p => p.id === 'help-center-bg');

export default function FaqPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <header className="absolute top-0 left-0 right-0 z-50 px-4 lg:px-6 h-16 flex items-center bg-transparent text-white">
        <div className="w-full max-w-7xl mx-auto flex items-center">
            <div className="flex-1 flex justify-start items-center gap-4">
                 <Link href="/" className="flex items-center justify-center gap-2">
                    <Calculator className="h-6 w-6" />
                    <h1 className="text-xl font-headline font-bold">Skarii</h1>
                </Link>
            </div>
            
            <div className="flex-1 flex justify-end">
                <Button asChild variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20">
                    <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
            </div>
        </div>
      </header>
      
      <main className="flex-1 w-full">
        <section className="relative h-[400px] flex flex-col items-center justify-center text-center text-white bg-slate-800">
            {helpCenterBg && (
                <Image
                    src={helpCenterBg.imageUrl}
                    alt={helpCenterBg.description}
                    layout="fill"
                    objectFit="cover"
                    className="opacity-40"
                    data-ai-hint={helpCenterBg.imageHint}
                    priority
                />
            )}
            <div className="relative z-10 p-4">
                <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">How can we help?</h1>
                <div className="max-w-2xl mx-auto">
                    <div className="relative">
                        <Input 
                            placeholder="Search for articles..." 
                            className="bg-white/80 border-transparent text-slate-800 placeholder:text-slate-500 h-14 pl-12 rounded-full shadow-lg focus:ring-2 focus:ring-primary"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400"/>
                    </div>
                </div>
            </div>
        </section>
        
        <section className="py-12 md:py-20 -mt-16 relative z-10 px-4">
            <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {faqData.map((category) => (
                        <Link href={`/faq/${category.slug}`} key={category.slug}>
                            <Card className="group bg-white dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl hover:-translate-y-1 transition-transform duration-300 h-full">
                                <CardContent className="p-6 text-center">
                                    <div className="inline-block p-4 bg-muted rounded-xl mb-4 group-hover:bg-primary/10 transition-colors">
                                        <category.icon className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-lg">{category.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
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


'use client';

import { useParams, useRouter } from 'next/navigation';
import { faqData, FaqCategory } from '@/lib/faq-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ChevronRight, Calculator, Search } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default function FaqCategoryPage() {
    const params = useParams();
    const router = useRouter();
    const { category: categorySlug } = params;

    const category: FaqCategory | undefined = faqData.find(cat => cat.slug === categorySlug);

    if (!category) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold">Category not found</h1>
                <Button onClick={() => router.push('/faq')} className="mt-4">Back to Help Center</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="w-full max-w-7xl mx-auto flex items-center">
                    <div className="flex-1 flex justify-start">
                        <Link href="/" className="flex items-center justify-center gap-2">
                            <Calculator className="h-6 w-6 text-primary" />
                            <h1 className="text-xl font-headline font-bold">Skarii</h1>
                        </Link>
                    </div>
                    <div className="flex-1 flex justify-end">
                        <Button asChild variant="outline">
                            <Link href="/dashboard">Go to Dashboard</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full py-12 md:py-16">
                <div className="max-w-4xl mx-auto px-4">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center text-sm text-muted-foreground mb-6">
                        <Link href="/faq" className="hover:underline">All Collections</Link>
                        <ChevronRight className="w-4 h-4 mx-1" />
                        <span>{category.title}</span>
                    </nav>

                    {/* Header */}
                    <div className="flex items-start gap-6 mb-8">
                        <div className="p-3 bg-muted rounded-lg border">
                           <category.icon className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold font-headline">{category.title}</h1>
                            <p className="text-muted-foreground mt-2">{category.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">{category.articles.length} articles</p>
                        </div>
                    </div>
                    
                    {/* Article List */}
                    <Card>
                        <CardContent className="p-0">
                            <ul className="divide-y">
                                {category.articles.map(article => (
                                    <li key={article.title} className="group">
                                        <Link href="#" className="block p-6 hover:bg-muted/50 transition-colors">
                                             <div className="flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{article.title}</h3>
                                                    <p className="text-sm text-muted-foreground mt-1">{article.description}</p>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                </div>
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

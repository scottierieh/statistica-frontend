
'use client';

import { useParams, useRouter } from 'next/navigation';
import { faqData, FaqCategory, FaqArticle } from '@/lib/faq-data';
import { Button } from '@/components/ui/button';
import { Calculator, ChevronRight, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function FaqArticlePage() {
    const params = useParams();
    const router = useRouter();
    const { category: categorySlug, article: articleSlug } = params;

    const category: FaqCategory | undefined = faqData.find(cat => cat.slug === categorySlug);
    const article: FaqArticle | undefined = category?.articles.find(art => art.slug === articleSlug);

    if (!category || !article) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold">Article not found</h1>
                <Button onClick={() => router.push('/faq')} className="mt-4">Back to Help Center</Button>
            </div>
        );
    }
    
    // A simple function to generate a table of contents from markdown-like headers
    const getTableOfContents = (content: string) => {
        const lines = content.split('\n');
        const headings = lines.filter(line => line.startsWith('### '));
        return headings.map(heading => {
            const title = heading.replace('### ', '').replace(/\*\*/g, '');
            // Create a URL-friendly slug from the title
            const slug = title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
            return {
                title: title,
                href: '#' + slug
            };
        });
    }
    
    const tableOfContents = getTableOfContents(article.content);

    // Replace markdown-like syntax with HTML tags, including IDs for linking
    const formatContent = (content: string) => {
        return content
            .replace(/### (.*?)\n/g, (match, p1) => {
                const slug = p1.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
                return `<h3 id="${slug}" class="text-xl font-semibold mt-6 mb-3 scroll-mt-20">${p1.replace(/\*\*/g, '')}</h3>\n`;
            })
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '<br/><br/>')
            .replace(/\n/g, '<br/>');
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
             <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="w-full max-w-7xl mx-auto flex items-center">
                    <div className="flex-1 flex justify-start">
                        <Link href="/" className="flex items-center justify-center gap-2">
                            <Calculator className="h-6 w-6 text-primary" />
                            <h1 className="text-xl font-headline font-bold">skari</h1>
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
                <div className="max-w-6xl mx-auto px-4">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center text-sm text-muted-foreground mb-8">
                        <Link href="/faq" className="hover:underline">All Collections</Link>
                        <ChevronRight className="w-4 h-4 mx-1" />
                        <Link href={`/faq/${category.slug}`} className="hover:underline">{category.title}</Link>
                        <ChevronRight className="w-4 h-4 mx-1" />
                        <span className="truncate">{article.title}</span>
                    </nav>

                    <div className="grid lg:grid-cols-4 gap-12">
                        {/* Main Content */}
                        <div className="lg:col-span-3">
                            <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">{article.title}</h1>
                            <p className="text-lg text-muted-foreground mb-8">{article.description}</p>
                            
                            <article className="prose prose-slate dark:prose-invert max-w-none"
                                     dangerouslySetInnerHTML={{ __html: formatContent(article.content) }}
                            >
                            </article>
                        </div>
                        
                        {/* Table of Contents */}
                        <aside className="lg:col-span-1 lg:sticky lg:top-24 self-start">
                            <div className="p-4 bg-muted/50 rounded-lg border">
                                <h3 className="font-semibold mb-3">In this article</h3>
                                <ul className="space-y-2">
                                    {tableOfContents.map(item => (
                                        <li key={item.href}>
                                            <a href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">{item.title}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
}

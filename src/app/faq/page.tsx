
'use client';

import React, { useState, useMemo } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { HelpCircle, Search, ChevronDown } from "lucide-react";
import Link from "next/link";
import { UserNav } from "@/components/user-nav";
import GuidePage from "@/components/pages/guide-page";
import { faqData } from '@/lib/faq-data';
import { cn } from '@/lib/utils';
import DashboardClientLayout from '@/components/dashboard-client-layout';

export default function FaqPage() {
    const [openCategories, setOpenCategories] = useState<string[]>(faqData.map(c => c.slug));
    const [searchTerm, setSearchTerm] = useState('');

    const toggleCategory = (category: string) => {
        setOpenCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const filteredFaqData = useMemo(() => {
        if (!searchTerm) {
          return faqData;
        }
        const lowercasedFilter = searchTerm.toLowerCase();
    
        return faqData.map(category => {
          if (category.title.toLowerCase().includes(lowercasedFilter) || category.description.toLowerCase().includes(lowercasedFilter)) {
              return category;
          }
          const filteredArticles = category.articles.filter(article => 
              article.title.toLowerCase().includes(lowercasedFilter) || 
              article.description.toLowerCase().includes(lowercasedFilter)
          );
          return filteredArticles.length > 0 ? { ...category, articles: filteredArticles } : null;
        }).filter(Boolean);
      }, [searchTerm]);

    return (
        <DashboardClientLayout>
            <SidebarProvider>
                <div className="flex min-h-screen w-full">
                    <Sidebar>
                        <SidebarHeader>
                            <div className="flex items-center gap-2 p-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                                    <HelpCircle className="h-6 w-6 text-primary-foreground" />
                                </div>
                                <h1 className="text-xl font-headline font-bold">Help Center</h1>
                            </div>
                            <div className='p-2'>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search articles..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                                </div>
                            </div>
                        </SidebarHeader>
                        <SidebarContent>
                            <SidebarMenu>
                                {filteredFaqData.map(category => (
                                    <Collapsible key={category.slug} open={openCategories.includes(category.slug)} onOpenChange={() => toggleCategory(category.slug)}>
                                        <CollapsibleTrigger asChild>
                                        <Button variant="ghost" className="w-full justify-start text-base px-2 font-semibold shadow-md border bg-white text-foreground hover:bg-slate-50">
                                            <category.icon className="mr-2 h-5 w-5" />
                                            <span>{category.title}</span>
                                            <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes(category.slug) && 'rotate-180')} />
                                        </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                        <SidebarMenu>
                                            {category.articles.map(article => (
                                                <SidebarMenuItem key={article.slug}>
                                                    <Link href={`/faq/${category.slug}/${article.slug}`} className="w-full">
                                                        <SidebarMenuButton className="w-full justify-start">
                                                            {article.title}
                                                        </SidebarMenuButton>
                                                    </Link>
                                                </SidebarMenuItem>
                                            ))}
                                        </SidebarMenu>
                                        </CollapsibleContent>
                                    </Collapsible>
                                ))}
                            </SidebarMenu>
                        </SidebarContent>
                    </Sidebar>
                    <SidebarInset>
                        <div className="p-4 md:p-6 h-full flex flex-col gap-4">
                            <header className="flex items-center justify-between md:justify-end">
                                <SidebarTrigger />
                                <div className="flex-1 flex justify-center md:hidden">
                                   <h1 className="text-xl font-headline font-bold">Help Center</h1>
                                </div>
                                <UserNav />
                            </header>
                            <main className="flex-1 overflow-auto">
                                <div className="max-w-7xl mx-auto py-8">
                                    <GuidePage />
                                </div>
                            </main>
                        </div>
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </DashboardClientLayout>
    );
}

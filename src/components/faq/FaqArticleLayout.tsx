'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';

export interface Section {
  id: string;
  label: string;
  level: number;
}

interface FaqArticleLayoutProps {
  children: React.ReactNode;
  tocItems: Section[];
}

export default function FaqArticleLayout({ children, tocItems }: FaqArticleLayoutProps) {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    if (tocItems.length === 0) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        },
        { rootMargin: '-100px 0px -70% 0px' }
    );

    tocItems.forEach(section => {
        const element = document.getElementById(section.id);
        if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [tocItems]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
        const offset = 100; // Header height
        const elementPosition = element.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
            top: elementPosition - offset,
            behavior: 'smooth',
        });
    }
  };

  return (
    <div className="flex gap-12">
      <main className="flex-1 min-w-0">
        {children}
      </main>
      
      {tocItems.length > 0 && (
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24">
            <Card>
                <CardContent className="p-4">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                        On This Page
                    </h4>
                    <nav className="space-y-1">
                        {tocItems.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className={cn(
                                    "block w-full text-left text-sm py-1.5 px-3 rounded-md transition-colors",
                                    activeSection === section.id
                                        ? 'text-primary font-medium bg-primary/10'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                                    section.level === 3 && "pl-6" // Indent h3
                                )}
                            >
                                {section.label}
                            </button>
                        ))}
                    </nav>
                </CardContent>
            </Card>
          </div>
        </aside>
      )}
    </div>
  );
}

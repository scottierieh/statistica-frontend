'use client';

import React from 'react';
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
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="flex flex-row items-start gap-12">
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
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      onClick={(e) => scrollToSection(e, section.id)}
                      className={cn(
                        "block w-full text-left text-sm py-1.5 px-3 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50",
                        section.level === 3 && "pl-6" // Indent h3
                      )}
                    >
                      {section.label}
                    </a>
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

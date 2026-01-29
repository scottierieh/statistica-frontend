'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export interface Section {
  id: string;
  label: string;
  level: number;
}

interface FaqArticleLayoutProps {
  children: React.ReactNode;
  tocItems?: Section[];
}

export default function FaqArticleLayout({ children, tocItems = [] }: FaqArticleLayoutProps) {
  const [activeId, setActiveId] = useState<string>('');
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      let currentId = '';
      if (tocItems) {
        for (let i = tocItems.length - 1; i >= 0; i--) {
          const item = tocItems[i];
          if (!item.id) continue;
          const element = document.getElementById(item.id);
          if (element && element.getBoundingClientRect().top < 150) {
            currentId = item.id;
            break;
          }
        }
      }
      setActiveId(currentId);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tocItems]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex w-full flex-row gap-12 px-4">
      <main className="flex-1 min-w-0">
        {children}
      </main>
      
      {tocItems.length > 0 && (
        <aside className="sticky top-24 hidden h-fit lg:block w-64 shrink-0">
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                On This Page
              </h4>
              <nav className="space-y-1">
                {tocItems.map((section) => (
                  <a
                    key={section.id || section.label}
                    href={`#${section.id}`}
                    onClick={(e) => scrollToSection(e, section.id)}
                    className={cn(
                      "block w-full text-left text-sm py-1.5 px-3 rounded-md transition-colors",
                      section.id === activeId
                        ? "text-primary bg-primary/10 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      section.level === 3 && "pl-6"
                    )}
                  >
                    {section.label}
                  </a>
                ))}
              </nav>
            </CardContent>
          </Card>
        </aside>
      )}
    </div>
  );
}

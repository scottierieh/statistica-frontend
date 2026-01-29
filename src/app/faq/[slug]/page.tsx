'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';

// Dynamically import all FAQ components
const FaqComponents: Record<string, React.ComponentType> = {
  'overview': React.lazy(() => import('@/components/pages/faq/overview-page')),
  'how-statistica-works': React.lazy(() => import('@/components/pages/faq/how-statistica-works')),
  'analysis-recommendation': React.lazy(() => import('@/components/pages/faq/analysis-recommendation')),
  'data-preparation': React.lazy(() => import('@/components/pages/faq/data-preparation')),
  'running-an-analysis': React.lazy(() => import('@/components/pages/faq/running-an-analysis')),
  'understanding-results': React.lazy(() => import('@/components/pages/faq/understanding-results')),
  'exporting-and-sharing': React.lazy(() => import('@/components/pages/faq/exporting-and-sharing')),
  'guide-terminology': React.lazy(() => import('@/components/pages/faq/guide-terminology')),
};

interface Section {
  id: string;
  label: string;
  level: number;
}

export default function FaqArticlePage() {
    const params = useParams();
    const slug = params.slug as string;
    const articleRef = useRef<HTMLDivElement>(null);

    const [sections, setSections] = useState<Section[]>([]);
    const [activeSection, setActiveSection] = useState('');

    const ActiveComponent = useMemo(() => {
        return FaqComponents[slug] || null;
    }, [slug]);

    const slugToKebabCase = (text: string) => {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    };

    // Effect to scrape headers and build the table of contents
    useEffect(() => {
        setSections([]); // Reset on component change
        const timeoutId = setTimeout(() => {
            if (articleRef.current) {
                const headingElements = Array.from(articleRef.current.querySelectorAll('h2, h3'));
                const newSections: Section[] = headingElements.map((el) => {
                    const label = el.textContent || '';
                    const id = el.id || slugToKebabCase(label);
                    if (!el.id) {
                        el.id = id; // Ensure headers have an ID
                    }
                    return {
                        id,
                        label,
                        level: parseInt(el.tagName.substring(1), 10),
                    };
                });
                setSections(newSections);
            }
        }, 100); // Delay to allow component to render
        return () => clearTimeout(timeoutId);
    }, [ActiveComponent]);

    // Effect for intersection observer to highlight active section
    useEffect(() => {
        if (sections.length === 0) return;

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

        sections.forEach(section => {
            const element = document.getElementById(section.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [sections]);

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

    if (!ActiveComponent) {
        return <div>Article not found.</div>;
    }

    return (
        <motion.div
            key={slug}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
        >
            <div className="flex flex-row items-start gap-8">
                <div ref={articleRef} className="flex-1 min-w-0">
                    <React.Suspense fallback={<div>Loading...</div>}>
                        <ActiveComponent />
                    </React.Suspense>
                </div>
                
                {sections.length > 0 && (
                    <aside className="hidden lg:block w-[280px] shrink-0">
                      <div className="sticky top-24">
                        <Card>
                            <CardContent className="p-4">
                                <nav className="space-y-1">
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                                        On This Page
                                    </h4>
                                    {sections.map((section) => (
                                        <button
                                            key={section.id}
                                            onClick={() => scrollToSection(section.id)}
                                            className={cn(
                                                "block w-full text-left text-sm py-2 px-3 rounded-md transition-colors",
                                                activeSection === section.id
                                                    ? 'text-primary font-medium bg-primary/10 border-l-2 border-primary'
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
        </motion.div>
    );
}

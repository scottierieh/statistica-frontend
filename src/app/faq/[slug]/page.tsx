'use client';

import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import React, { useState, useEffect, useRef } from 'react';

// Import ALL components and their section data
import HowStatisticaWorksPage, { SECTIONS as HowStatisticaWorksSections } from '@/components/pages/faq/how-statistica-works';
import AnalysisRecommendationPage, { SECTIONS as AnalysisRecommendationSections } from '@/components/pages/faq/analysis-recommendation';
import DataPreparationPage, { SECTIONS as DataPreparationSections } from '@/components/pages/faq/data-preparation';
import RunningAnalysisPage, { SECTIONS as RunningAnalysisSections } from '@/components/pages/faq/running-an-analysis';
import UnderstandingResultsPage, { SECTIONS as UnderstandingResultsSections } from '@/components/pages/faq/understanding-results';
import ExportingSharingPage, { SECTIONS as ExportingSharingSections } from '@/components/pages/faq/exporting-and-sharing';
import TroubleshootingFaqPage, { SECTIONS as TroubleshootingSections } from '@/components/pages/faq/guide-terminology';
import OverviewPage, { SECTIONS as OverviewSections } from '@/components/pages/faq/overview-page';

// Map slugs to components and their section data
const FaqComponents: Record<string, { component: React.ComponentType, sections: {id: string, label: string}[] }> = {
  'how-statistica-works': { component: HowStatisticaWorksPage, sections: HowStatisticaWorksSections },
  'analysis-recommendation': { component: AnalysisRecommendationPage, sections: AnalysisRecommendationSections },
  'data-preparation': { component: DataPreparationPage, sections: DataPreparationSections },
  'running-an-analysis': { component: RunningAnalysisPage, sections: RunningAnalysisSections },
  'understanding-results': { component: UnderstandingResultsPage, sections: UnderstandingResultsSections },
  'exporting-and-sharing': { component: ExportingSharingPage, sections: ExportingSharingSections },
  'guide-terminology': { component: TroubleshootingFaqPage, sections: TroubleshootingSections },
  'overview': { component: OverviewPage, sections: OverviewSections },
};

export default function FaqArticlePage() {
    const params = useParams();
    const slug = params.slug as string;

    const [activeSection, setActiveSection] = useState('');
    const articleData = FaqComponents[slug];

    useEffect(() => {
        if (!articleData || !articleData.sections) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { rootMargin: '-100px 0px -80% 0px' }
        );

        articleData.sections.forEach(section => {
            const element = document.getElementById(section.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [slug, articleData]);

    if (!articleData) {
        return (
             <div className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Article not found</h1>
                <p>The page you are looking for could not be found.</p>
            </div>
        );
    }
    
    const { component: Component, sections } = articleData;

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const offset = 100;
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
        }
    };
    
    return (
        <motion.div
            key={slug}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
        >
            <div className="grid lg:grid-cols-[1fr_280px] gap-8 items-start">
                <div className="flex-1 min-w-0">
                    <Component />
                </div>
                {sections && sections.length > 0 && (
                    <aside className="hidden lg:block">
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
                                                    "block w-full text-left text-sm py-2 px-3 rounded transition-colors",
                                                    activeSection === section.id
                                                        ? 'text-primary font-medium bg-primary/10 border-l-2 border-primary'
                                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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

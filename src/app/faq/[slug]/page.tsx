'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import FaqArticleLayout from '@/components/faq/FaqArticleLayout';

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

export default function FaqArticlePage() {
    const params = useParams();
    const slug = params.slug as string;
    
    const ActiveComponent = useMemo(() => {
        return FaqComponents[slug] || null;
    }, [slug]);

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
            <React.Suspense fallback={<div>Loading...</div>}>
                <ActiveComponent />
            </React.Suspense>
        </motion.div>
    );
}

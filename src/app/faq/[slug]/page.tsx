'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import FaqArticleLayout from '@/components/faq/FaqArticleLayout';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import all FAQ components
const FaqComponents: Record<string, React.ComponentType> = {
  'overview': React.lazy(() => import('@/components/pages/faq/overview-page')),
  'how-statistica-works': React.lazy(() => import('@/components/pages/faq/statistical analysis/how-statistica-works')),
  'analysis-recommendation': React.lazy(() => import('@/components/pages/faq/statistical analysis/analysis-recommendation')),
  'data-preparation': React.lazy(() => import('@/components/pages/faq/statistical analysis/data-preparation')),
  'running-an-analysis': React.lazy(() => import('@/components/pages/faq/statistical analysis/running-an-analysis')),
  'understanding-results': React.lazy(() => import('@/components/pages/faq/statistical analysis/understanding-results')),
  'exporting-and-sharing': React.lazy(() => import('@/components/pages/faq/statistical analysis/exporting-and-sharing')),
  'guide-terminology': React.lazy(() => import('@/components/pages/faq/guide-terminology')),
  // New Strategic Decision Guide pages
  'strategic-overview': React.lazy(() => import('@/components/pages/faq/strategic-overview')),
  'use-cases-by-domain': React.lazy(() => import('@/components/pages/faq/use-cases-by-domain')),
  'strategic-data-requirements': React.lazy(() => import('@/components/pages/faq/strategic-data-requirements')),
  'optimization-methods': React.lazy(() => import('@/components/pages/faq/optimization-methods')),
  'interpreting-solutions': React.lazy(() => import('@/components/pages/faq/interpreting-solutions')),
  'strategic-best-practices': React.lazy(() => import('@/components/pages/faq/strategic-best-practices')),
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-12 w-3/4" />
    <Skeleton className="h-6 w-1/2" />
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  </div>
);

export default function FaqArticlePage() {
    const params = useParams();
    const slug = params.slug as string;
    
    const ActiveComponent = useMemo(() => {
        return FaqComponents[slug] || null;
    }, [slug]);

    if (!ActiveComponent) {
        return (
          <FaqArticleLayout>
            <div>Article not found. Please select an article from the sidebar.</div>
          </FaqArticleLayout>
        )
    }

    return (
        <motion.div
            key={slug}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
        >
            <React.Suspense fallback={<LoadingSkeleton />}>
                <ActiveComponent />
            </React.Suspense>
        </motion.div>
    );
}

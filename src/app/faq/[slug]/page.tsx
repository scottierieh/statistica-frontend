'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import FaqArticleLayout from '@/components/faq/FaqArticleLayout';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import all FAQ components
const FaqComponents: Record<string, React.ComponentType> = {
  // Introduction
  'platform-overview': React.lazy(() => import('@/components/pages/faq/platform-overview')),
  'user-types': React.lazy(() => import('@/components/pages/faq/user-types')),
  'end-to-end-workflow': React.lazy(() => import('@/components/pages/faq/end-to-end-workflow')),

  // Getting Started
  'sign-up': React.lazy(() => import('@/components/pages/faq/sign-up')),
  'login': React.lazy(() => import('@/components/pages/faq/login')),
  'pricing-billing': React.lazy(() => import('@/components/pages/faq/pricing-billing')),

  // Workspace Basics
  'dashboard-overview': React.lazy(() => import('@/components/pages/faq/dashboard-overview')),
  'projects-datasets': React.lazy(() => import('@/components/pages/faq/projects-datasets')),
  'data-upload': React.lazy(() => import('@/components/pages/faq/data-upload')),

  // Data Transformation
  'transformation-overview': React.lazy(() => import('@/components/pages/faq/transformation-overview')),
  'missing-value-handling': React.lazy(() => import('@/components/pages/faq/missing-value-handling')),
  'variable-transformation': React.lazy(() => import('@/components/pages/faq/variable-transformation')),
  'encoding-scaling': React.lazy(() => import('@/components/pages/faq/encoding-scaling')),
  'data-validation': React.lazy(() => import('@/components/pages/faq/data-validation')),

  // Statistical Analysis
  'overview': React.lazy(() => import('@/components/pages/faq/statistical analysis/overview-page')),
  'analysis-recommendation': React.lazy(() => import('@/components/pages/faq/statistical analysis/analysis-recommendation')),
  'data-preparation': React.lazy(() => import('@/components/pages/faq/statistical analysis/data-preparation')),
  'running-an-analysis': React.lazy(() => import('@/components/pages/faq/statistical analysis/running-an-analysis')),
  'understanding-results': React.lazy(() => import('@/components/pages/faq/statistical analysis/understanding-results')),
  'exporting-and-sharing': React.lazy(() => import('@/components/pages/faq/statistical analysis/exporting-and-sharing')),
  'guide-terminology': React.lazy(() => import('@/components/pages/faq/guide-terminology')),

  // Strategic Decision Analysis
  'strategic-overview': React.lazy(() => import('@/components/pages/faq/strategic-overview')),
  'use-cases-by-domain': React.lazy(() => import('@/components/pages/faq/use-cases-by-domain')),
  'strategic-data-requirements': React.lazy(() => import('@/components/pages/faq/strategic-data-requirements')),
  'optimization-methods': React.lazy(() => import('@/components/pages/faq/optimization-methods')),
  'interpreting-solutions': React.lazy(() => import('@/components/pages/faq/interpreting-solutions')),
  'strategic-best-practices': React.lazy(() => import('@/components/pages/faq/strategic-best-practices')),
  
  // SEM
  'sem-overview': React.lazy(() => import('@/components/pages/faq/sem-overview')),
  'path-diagram-upload': React.lazy(() => import('@/components/pages/faq/path-diagram-upload')),
  'model-estimation': React.lazy(() => import('@/components/pages/faq/model-estimation')),
  'sem-result-interpretation': React.lazy(() => import('@/components/pages/faq/sem-result-interpretation')),
  'sem-model-diagnostics': React.lazy(() => import('@/components/pages/faq/sem-model-diagnostics')),
  
  // Results Interpretation Guide
  'statistical-significance': React.lazy(() => import('@/components/pages/faq/statistical-significance')),
  'effect-size': React.lazy(() => import('@/components/pages/faq/effect-size')),
  'practical-implications': React.lazy(() => import('@/components/pages/faq/practical-implications')),
  
  // Account & Settings
  'profile-management': React.lazy(() => import('@/components/pages/faq/profile-management')),
  'security-data-policy': React.lazy(() => import('@/components/pages/faq/security-data-policy')),

  // Troubleshooting
  'common-errors': React.lazy(() => import('@/components/pages/faq/common-errors')),
  'data-issues': React.lazy(() => import('@/components/pages/faq/data-issues')),
  'billing-issues': React.lazy(() => import('@/components/pages/faq/billing-issues')),
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

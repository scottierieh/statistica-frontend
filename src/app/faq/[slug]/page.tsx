'use client';

import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';

import { faqData } from '@/lib/faq-data';

// Import all the new components
import HowStatisticaWorksPage from '@/components/pages/faq/how-statistica-works';
import AnalysisRecommendationPage from '@/components/pages/faq/analysis-recommendation';
import DataPreparationPage from '@/components/pages/faq/data-preparation';
import RunningAnalysisPage from '@/components/pages/faq/running-an-analysis';
import UnderstandingResultsPage from '@/components/pages/faq/understanding-results';
import ExampleBasedAnalysisPage from '@/components/pages/faq/example-based-analysis';
import ExportingSharingPage from '@/components/pages/faq/exporting-and-sharing';
import TroubleshootingFaqPage from '@/components/pages/faq/troubleshooting-faq';
import OverviewPage from '@/components/pages/faq/overview-page';

const FaqComponents: Record<string, React.ComponentType> = {
  'how-statistica-works': HowStatisticaWorksPage,
  'analysis-recommendation': AnalysisRecommendationPage,
  'data-preparation': DataPreparationPage,
  'running-an-analysis': RunningAnalysisPage,
  'understanding-results': UnderstandingResultsPage,
  'example-based-analysis': ExampleBasedAnalysisPage,
  'exporting-and-sharing': ExportingSharingPage,
  'troubleshooting-faq': TroubleshootingFaqPage,
  'overview': OverviewPage,
};


export default function FaqArticlePage() {
    const params = useParams();
    const slug = params.slug as string;

    const article = faqData
        .flatMap(category => category.articles)
        .find(article => article.slug === slug);
    
    const Component = FaqComponents[slug];

    if (!article || !Component) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Article not found</h1>
                <p>The page you are looking for could not be found.</p>
            </div>
        );
    }
    
    return (
        <motion.div
            key={slug}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
        >
            <Component />
        </motion.div>
    );
}

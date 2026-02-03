'use client';
import PlatformOverviewPage from '@/components/pages/faq/platform-overview';
import { motion } from 'framer-motion';

export default function FaqIndexPage() {
    return (
        <motion.div
            key="platform-overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
        >
            <PlatformOverviewPage />
        </motion.div>
    );
}

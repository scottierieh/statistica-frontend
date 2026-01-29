'use client';
import GuidePage from '@/components/pages/faq/guide-page';
import { motion } from 'framer-motion';

export default function FaqIndexPage() {
    return (
        <motion.div
            key="guide"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
        >
            <GuidePage />
        </motion.div>
    );
}

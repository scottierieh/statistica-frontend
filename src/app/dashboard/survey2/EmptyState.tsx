
'use client';
import { motion } from "framer-motion";
import { FolderSearch } from "lucide-react";

interface EmptyStateProps {
    filter: string;
}

export default function EmptyState({ filter }: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center col-span-full py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"
        >
            <FolderSearch className="mx-auto h-16 w-16 text-slate-400" />
            <h2 className="mt-4 text-xl font-semibold text-slate-700">No surveys found</h2>
            <p className="mt-2 text-slate-500">
                There are no surveys matching the filter "{filter}".
            </p>
        </motion.div>
    );
}

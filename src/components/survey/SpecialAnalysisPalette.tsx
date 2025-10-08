'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { Target, Network, DollarSign, Users, ClipboardList, Handshake } from "lucide-react";
import Link from 'next/link';

const specialAnalyses = [
    {
        href: "/dashboard/createsurvey?template=ipa",
        icon: Target,
        title: "IPA Survey",
        description: "Measure Importance vs. Performance to find key improvement areas."
    },
    {
        href: "/dashboard/createsurvey?template=cbc",
        icon: Handshake,
        title: "Choice-Based Conjoint",
        description: "Understand how customers value different attributes of a product using choices."
    },
     {
        href: "/dashboard/createsurvey?template=rating-conjoint",
        icon: ClipboardList,
        title: "Rating Conjoint",
        description: "Analyze customer preferences using a rating-based approach."
    },
    {
        href: "/dashboard/createsurvey?template=van-westendorp",
        icon: DollarSign,
        title: "Price Sensitivity (PSM)",
        description: "Use the Van Westendorp model to find optimal price points."
    },
    {
        href: "/dashboard/createsurvey?template=turf",
        icon: Users,
        title: "TURF Analysis",
        description: "Identify the best combination of items to maximize reach."
    },
    {
        href: "/dashboard/createsurvey?template=ahp-criteria",
        icon: Network,
        title: "AHP Survey",
        description: "Make complex decisions by comparing criteria and alternatives pairwise."
    },
];


const TemplateCard = ({ icon: Icon, title, href, isButton = false }: { icon: React.ElementType, title: string, href: string, isButton?: boolean }) => {
    const content = (
        <div className="group relative w-full">
            <Button
                variant="ghost"
                className="w-full justify-start h-12 text-base"
                asChild={!isButton}
            >
                <>
                    <Icon className="w-5 h-5 mr-3 text-primary" />
                    {title}
                </>
            </Button>
        </div>
    );
    
    if(isButton) return content;

    return <Link href={href}>{content}</Link>
};


export const SpecialAnalysisPalette = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
    >
      <h3 className="text-lg font-bold text-slate-900 mb-4">Analysis Templates</h3>
       <div className="space-y-1">
            {specialAnalyses.map((analysis) => (
                <TemplateCard key={analysis.href} {...analysis} />
            ))}
        </div>
    </motion.div>
  );
};

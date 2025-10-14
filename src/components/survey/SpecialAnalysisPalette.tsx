
'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { 
  Target, 
  Network, 
  DollarSign, 
  Users, 
  ClipboardList, 
  Handshake, 
  Plus,
  ArrowDownUp
} from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";

interface AnalysisTemplate {
  href: string;
  icon: any;
  title: string;
  description: string;
  color: string;
}

const specialAnalyses: AnalysisTemplate[] = [
  {
    href: "/dashboard/createsurvey?template=ipa",
    icon: Target,
    title: "IPA Survey",
    description: "Importance vs. Performance analysis",
    color: "bg-blue-500"
  },
  {
    href: "/dashboard/createsurvey?template=cbc",
    icon: Handshake,
    title: "Choice-Based Conjoint",
    description: "Analyze customer preferences",
    color: "bg-green-500"
  },
  {
    href: "/dashboard/createsurvey?template=rating-conjoint",
    icon: ClipboardList,
    title: "Rating Conjoint",
    description: "Rating-based preference analysis",
    color: "bg-purple-500"
  },
  {
    href: "/dashboard/createsurvey?template=ranking-conjoint",
    icon: ArrowDownUp,
    title: "Ranking Conjoint",
    description: "Rank-based preference analysis",
    color: "bg-indigo-500"
  },
  {
    href: "/dashboard/createsurvey?template=van-westendorp",
    icon: DollarSign,
    title: "Price Sensitivity (PSM)",
    description: "Find optimal price points",
    color: "bg-emerald-500"
  },
  {
    href: "/dashboard/createsurvey?template=turf",
    icon: Users,
    title: "TURF Analysis",
    description: "Maximize reach combination",
    color: "bg-orange-500"
  },
  {
    href: "/dashboard/createsurvey?template=ahp-criteria",
    icon: Network,
    title: "AHP Survey",
    description: "Pairwise comparison analysis",
    color: "bg-violet-500"
  },
  {
    href: "/dashboard/createsurvey?template=csat",
    icon: ClipboardList,
    title: "CSAT Survey",
    description: "Customer satisfaction measurement",
    color: "bg-sky-500"
  }
];

const TemplateCard = ({ 
  analysis 
}: { 
  analysis: AnalysisTemplate;
}) => {
  return (
    <Link href={analysis.href}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start h-auto py-2.5 px-3",
          "hover:bg-slate-50 group relative",
          "transition-colors"
        )}
      >
        <div className="flex items-center gap-3 w-full">
          {/* Icon */}
          <div className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
            "transition-transform group-hover:scale-105",
            analysis.color
          )}>
            <analysis.icon className="w-4 h-4 text-white" />
          </div>
          
          {/* Text */}
          <div className="flex-1 text-left min-w-0">
            <div className="font-medium text-sm text-slate-900 truncate">
              {analysis.title}
            </div>
            <div className="text-xs text-slate-500 truncate">
              {analysis.description}
            </div>
          </div>
          
          {/* Plus Icon */}
          <Plus className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>
      </Button>
    </Link>
  );
};

export const SpecialAnalysisPalette = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200"
    >
      {/* Header */}
      <div className="p-4 border-b bg-slate-50">
        <h3 className="font-semibold text-slate-900">Analysis Templates</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Advanced research methods
        </p>
      </div>

      {/* Templates List */}
      <div className="p-3 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="space-y-1">
          {specialAnalyses.map((analysis) => (
            <TemplateCard key={analysis.href} analysis={analysis} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SpecialAnalysisPalette;


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
  ArrowDownUp,
  Replace,
  Activity,
  ShieldCheck,
  BrainCircuit,
  Scaling,
  Map,
  Feather
} from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { exampleDatasets } from '@/lib/example-datasets';

interface AnalysisTemplate {
  href?: string;
  onClick?: () => void;
  icon: any;
  title: string;
  description: string;
}

const TemplateCard = ({ analysis }: { analysis: AnalysisTemplate }) => {
  const content = (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start h-auto py-2.5 px-3",
        "hover:bg-slate-50 group relative",
        "transition-colors"
      )}
      onClick={analysis.onClick}
    >
      <div className="flex items-center gap-3 w-full">
        <div className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-primary bg-primary/10",
          "transition-transform group-hover:scale-105",
        )}>
          <analysis.icon className="w-4 h-4" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="font-medium text-sm text-slate-900 truncate">
            {analysis.title}
          </div>
          <div className="text-xs text-slate-500 truncate">
            {analysis.description}
          </div>
        </div>
        <Plus className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    </Button>
  );

  return analysis.href ? <Link href={analysis.href}>{content}</Link> : content;
};

interface SpecialAnalysisPaletteProps {
  onLoadExample?: (example: any) => void;
}

export const SpecialAnalysisPalette = ({ onLoadExample }: SpecialAnalysisPaletteProps) => {
  const templateCategories: Record<string, AnalysisTemplate[]> = {
    "Customer Experience": [
        { href: "/dashboard/createsurvey?template=csat", icon: ClipboardList, title: "CSAT Survey", description: "Measure overall customer satisfaction." },
        { 
            onClick: () => onLoadExample?.(exampleDatasets.find(e => e.id === 'ces-data')),
            icon: Feather, 
            title: "CES Survey", 
            description: "Measure customer effort." 
        },
        { href: "/dashboard/createsurvey?template=nps", icon: ShieldCheck, title: "NPS Survey", description: "Measure customer loyalty." },
        { href: "/dashboard/createsurvey?template=servqual", icon: ClipboardList, title: "SERVQUAL", description: "Compare service expectations vs. perceptions." },
        { href: "/dashboard/createsurvey?template=servperf", icon: ClipboardList, title: "SERVPERF", description: "Measure service quality based on performance." },
        { href: "/dashboard/createsurvey?template=semantic-differential", icon: Replace, title: "Semantic Differential", description: "Analyze brand perception on bipolar scales." },
    ],
    "Product & Strategy": [
        { href: "/dashboard/createsurvey?template=cbc", icon: Handshake, title: "Choice-Based Conjoint", description: "Analyze preferences for product features." },
        { href: "/dashboard/createsurvey?template=rating-conjoint", icon: ClipboardList, title: "Rating Conjoint", description: "Rating-based preference analysis." },
        { href: "/dashboard/createsurvey?template=ranking-conjoint", icon: ArrowDownUp, title: "Ranking Conjoint", description: "Rank-based preference analysis." },
        { href: "/dashboard/createsurvey?template=ipa", icon: Target, title: "IPA Survey", description: "Find key improvement areas." },
        { href: "/dashboard/createsurvey?template=ahp-criteria", icon: Network, title: "AHP Survey", description: "Pairwise comparison for decisions." },
        { 
            onClick: () => onLoadExample?.(exampleDatasets.find(e => e.id === 'kano-model')),
            icon: BrainCircuit, 
            title: "Kano Model Analysis", 
            description: "Classify features into must-haves, satisfiers, and delighters." 
        },
    ],
    "Market & Pricing": [
        { href: "/dashboard/createsurvey?template=turf", icon: Users, title: "TURF Analysis", description: "Maximize reach with product combinations." },
        { href: "/dashboard/createsurvey?template=van-westendorp", icon: DollarSign, title: "Price Sensitivity (PSM)", description: "Find optimal price points." },
        { href: "/dashboard/createsurvey?template=gabor-granger-1", icon: DollarSign, title: "Gabor-Granger", description: "Measures willingness to pay." },
        { href: "/dashboard/createsurvey?template=cvm", icon: Scaling, title: "CVM / WTP Survey", description: "Measure Willingness to Pay for non-market goods." },
        { href: "/dashboard/createsurvey?template=brand-funnel", icon: Activity, title: "Brand Funnel", description: "Track awareness to usage." },
    ],
    "Segmentation": [
        { href: "/dashboard/createsurvey?template=clustering", icon: BrainCircuit, title: "Clustering Analysis", description: "Segment respondents based on behavior and attitudes." },
        { href: "/dashboard/createsurvey?template=mds", icon: Map, title: "MDS Analysis", description: "Visualize brand positioning based on attribute ratings." }
    ]
};

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
        <div className="space-y-4">
          {Object.entries(templateCategories).map(([category, templates]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-slate-500 mb-2 px-1">
                {category}
              </h4>
              <div className="space-y-1">
                {templates.map((analysis) => (
                  <TemplateCard key={analysis.title} analysis={analysis} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

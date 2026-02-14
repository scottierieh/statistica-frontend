
'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { 
  Users,
  CircleDot, 
  CheckSquare, 
  CaseSensitive, 
  Star, 
  FileText, 
  Share2, 
  ThumbsUp, 
  Grid3x3, 
  ChevronDown, 
  Sigma, 
  Phone, 
  Mail, 
  Network, 
  ClipboardList, 
  Replace,
  Plus,
  ArrowDownUp
} from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface QuestionType {
  type: string;
  label: string;
  icon: any;
  description: string;
}

interface QuestionTypePaletteProps {
  onSelectType: (type: string) => void;
}

export const QuestionTypePalette = ({ onSelectType }: QuestionTypePaletteProps) => {
  const questionTypeCategories: Record<string, QuestionType[]> = {
    'Choice Questions': [
      { type: 'single', label: 'Single Choice', icon: CircleDot, description: 'Select one option' },
      { type: 'multiple', label: 'Multiple Choice', icon: CheckSquare, description: 'Select multiple' },
      { type: 'dropdown', label: 'Dropdown', icon: ChevronDown, description: 'Dropdown list' },
      { type: 'best-worst', label: 'Best/Worst Choice', icon: ThumbsUp, description: 'Pick extremes' },
      { type: 'matrix', label: 'Matrix Grid', icon: Grid3x3, description: 'Multi-row questions' },
    ],
    'Text Input': [
      { type: 'text', label: 'Text', icon: CaseSensitive, description: 'Short text' },
      { type: 'number', label: 'Number', icon: Sigma, description: 'Numeric input' },
    ],
    'Rating & Scale': [
      { type: 'rating', label: 'Star Rating', icon: Star, description: '5-star rating' },
      { type: 'nps', label: 'NPS Score', icon: Share2, description: '0-10 scale' },
      { type: 'likert', label: 'Likert Scale', icon: ClipboardList, description: 'Agreement scale' },
    ],
    'Other': [
      { type: 'description', label: 'Description', icon: FileText, description: 'Text block' },
    ]
  };
  
  const demographicTypes: QuestionType[] = [
    { type: 'single', label: 'Gender / Age Group', icon: Users, description: 'Single choice for demographics' },
    { type: 'dropdown', label: 'Country / Region', icon: ChevronDown, description: 'Dropdown for location' },
    { type: 'number', label: 'Age (Number)', icon: Sigma, description: 'Numeric age input' },
    { type: 'phone', label: 'Phone', icon: Phone, description: 'Phone number input' },
    { type: 'email', label: 'Email', icon: Mail, description: 'Email address input' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200"
    >
      {/* Header */}
      <div className="p-4 border-b bg-slate-50">
        <h3 className="font-semibold text-slate-900">Add Question</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Choose a question type
        </p>
      </div>

      {/* Question Types List */}
      <div className="p-3 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="space-y-4">
          <Collapsible>
            <CollapsibleTrigger asChild>
                <div className="p-3 rounded-lg border bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-primary bg-primary/10">
                            <Users className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-left">
                            <h4 className="font-medium text-sm text-slate-900">Demographics</h4>
                            <p className="text-xs text-slate-500">Add common demographic questions.</p>
                        </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-500 transition-transform [&[data-state=open]]:rotate-180" />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="pt-2 space-y-1">
                    {demographicTypes.map((qType) => (
                      <QuestionTypeButton
                        key={qType.type + qType.label}
                        qType={qType}
                        onClick={() => onSelectType(qType.type)}
                      />
                    ))}
                </div>
            </CollapsibleContent>
          </Collapsible>
          
          {Object.entries(questionTypeCategories).map(([category, types]) => (
            <div key={category}>
              {/* Category Header */}
              <h4 className="text-xs font-medium text-slate-500 mb-2 px-1">
                {category}
              </h4>
              
              {/* Question Type Buttons */}
              <div className="space-y-1">
                {types.map((qType) => (
                  <QuestionTypeButton
                    key={qType.type + qType.label}
                    qType={qType}
                    onClick={() => onSelectType(qType.type)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const QuestionTypeButton = ({ 
  qType, 
  onClick 
}: { 
  qType: QuestionType; 
  onClick: () => void;
}) => {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start h-auto py-2.5 px-3",
        "hover:bg-slate-50 group relative",
        "transition-colors"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 w-full">
        {/* Icon */}
        <div className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-primary bg-primary/10",
          "transition-transform group-hover:scale-105",
        )}>
          <qType.icon className="w-4 h-4" />
        </div>
        
        {/* Text */}
        <div className="flex-1 text-left min-w-0">
          <div className="font-medium text-sm text-slate-900 truncate">
            {qType.label}
          </div>
          <div className="text-xs text-slate-500 truncate">
            {qType.description}
          </div>
        </div>
        
        {/* Plus Icon */}
        <Plus className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    </Button>
  );
};

export default QuestionTypePalette;

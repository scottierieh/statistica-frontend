'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { 
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
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionType {
  type: string;
  label: string;
  icon: any;
  color: string;
  description: string;
}

interface QuestionTypePaletteProps {
  onSelectType: (type: string) => void;
}

export const QuestionTypePalette = ({ onSelectType }: QuestionTypePaletteProps) => {
  const questionTypeCategories: Record<string, QuestionType[]> = {
    'Choice Questions': [
      { type: 'single', label: 'Single Choice', icon: CircleDot, color: 'bg-blue-500', description: 'Select one option' },
      { type: 'multiple', label: 'Multiple Choice', icon: CheckSquare, color: 'bg-green-500', description: 'Select multiple' },
      { type: 'dropdown', label: 'Dropdown', icon: ChevronDown, color: 'bg-cyan-500', description: 'Dropdown list' },
      { type: 'best-worst', label: 'Best/Worst', icon: ThumbsUp, color: 'bg-amber-500', description: 'Pick extremes' },
    ],
    'Text Input': [
      { type: 'text', label: 'Text', icon: CaseSensitive, color: 'bg-slate-500', description: 'Short text' },
      { type: 'number', label: 'Number', icon: Sigma, color: 'bg-fuchsia-500', description: 'Numeric value' },
      { type: 'phone', label: 'Phone', icon: Phone, color: 'bg-indigo-500', description: 'Phone number' },
      { type: 'email', label: 'Email', icon: Mail, color: 'bg-rose-500', description: 'Email address' },
    ],
    'Rating & Scale': [
      { type: 'rating', label: 'Star Rating', icon: Star, color: 'bg-yellow-500', description: '5-star rating' },
      { type: 'nps', label: 'NPS Score', icon: Share2, color: 'bg-sky-500', description: '0-10 scale' },
      { type: 'likert', label: 'Likert Scale', icon: ClipboardList, color: 'bg-teal-500', description: 'Agreement scale' },
      { type: 'semantic-differential', label: 'Semantic Differential', icon: Replace, color: 'bg-lime-500', description: 'Bipolar scales' },
    ],
    'Advanced': [
      { type: 'matrix', label: 'Matrix Grid', icon: Grid3x3, color: 'bg-purple-500', description: 'Multi-row questions' },
      { type: 'conjoint', label: 'Conjoint (Choice)', icon: Network, color: 'bg-violet-500', description: 'Choice analysis' },
      { type: 'rating-conjoint', label: 'Conjoint (Rating)', icon: ClipboardList, color: 'bg-orange-500', description: 'Rating analysis' },
    ],
    'Other': [
      { type: 'description', label: 'Description', icon: FileText, color: 'bg-gray-400', description: 'Text block' },
    ]
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200"
    >
      {/* Header - 더 차분한 스타일 */}
      <div className="p-4 border-b bg-slate-50">
        <h3 className="font-semibold text-slate-900">Add Question</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Choose a question type
        </p>
      </div>

      {/* Question Types List */}
      <div className="p-3 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="space-y-4">
          {Object.entries(questionTypeCategories).map(([category, types]) => (
            <div key={category}>
              {/* Category Header - 더 심플하게 */}
              <h4 className="text-xs font-medium text-slate-500 mb-2 px-1">
                {category}
              </h4>
              
              {/* Question Type Buttons */}
              <div className="space-y-1">
                {types.map((qType) => (
                  <QuestionTypeButton
                    key={qType.type}
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

// Question Type Button - 더 차분하고 일관된 스타일
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
        {/* Icon - 더 작고 차분하게 */}
        <div className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
          "transition-transform group-hover:scale-105",
          qType.color
        )}>
          <qType.icon className="w-4 h-4 text-white" />
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
        
        {/* Plus Icon - hover시에만 표시 */}
        <Plus className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    </Button>
  );
};

export default QuestionTypePalette;
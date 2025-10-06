'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { CircleDot, CheckSquare, CaseSensitive, Star, PlusCircle, FileText, Share2, ThumbsUp, Grid3x3, ChevronDown, Sigma, Phone, Mail } from "lucide-react";

export const QuestionTypePalette = ({ onSelectType }: { onSelectType: (type: string) => void }) => {
    const questionTypeCategories = {
    'Choice': [
        { type: 'single', label: 'Single Selection', icon: CircleDot, color: 'text-blue-500' },
        { type: 'multiple', label: 'Multiple Selection', icon: CheckSquare, color: 'text-green-500' },
        { type: 'dropdown', label: 'Dropdown', icon: ChevronDown, color: 'text-cyan-500' },
        { type: 'best-worst', label: 'Best/Worst Choice', icon: ThumbsUp, color: 'text-amber-500' },
    ],
    'Input': [
        { type: 'text', label: 'Text Input', icon: CaseSensitive, color: 'text-slate-500' },
        { type: 'number', label: 'Number Input', icon: Sigma, color: 'text-fuchsia-500' },
        { type: 'phone', label: 'Phone Input', icon: Phone, color: 'text-indigo-500' },
        { type: 'email', label: 'Email Input', icon: Mail, color: 'text-rose-500' },
    ],
    'Scale': [
        { type: 'rating', label: 'Rating', icon: Star, color: 'text-yellow-500' },
        { type: 'nps', label: 'Net Promoter Score', icon: Share2, color: 'text-sky-500' },
    ],
    'Structure': [
         { type: 'description', label: 'Description Block', icon: FileText, color: 'text-gray-400' },
         { type: 'matrix', label: 'Matrix', icon: Grid3x3, color: 'text-purple-500' },
    ]
};
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
    >
      <h3 className="text-lg font-bold text-slate-900 mb-4">Add a Question</h3>
       <div className="space-y-2">
            {Object.entries(questionTypeCategories).map(([category, types]) => (
                <div key={category}>
                    <h4 className="text-sm font-semibold text-muted-foreground px-2 my-2">{category}</h4>
                    {types.map((qType) => (
                        <div key={qType.type} className="group relative">
                            <Button
                                variant="ghost"
                                className="w-full justify-start h-12 text-base"
                                onClick={() => onSelectType(qType.type)}
                            >
                                <qType.icon className={`w-5 h-5 mr-3 ${qType.color}`} />
                                {qType.label}
                            </Button>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </motion.div>
  );
};

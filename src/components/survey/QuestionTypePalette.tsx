'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, CaseSensitive, CheckSquare, CircleDot, ChevronDown, Star, Sigma } from 'lucide-react';
import { motion } from 'framer-motion';

const questionTypes = [
  { type: 'single_selection', label: 'Single Selection', icon: CircleDot },
  { type: 'multiple_selection', label: 'Multiple Selection', icon: CheckSquare },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown },
  { type: 'text', label: 'Text Input', icon: CaseSensitive },
  { type: 'number_input', label: 'Number Input', icon: Sigma },
  { type: 'rating', label: 'Rating', icon: Star },
];

export default function QuestionTypePalette({ onSelectType }: { onSelectType: (type: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
    >
      <h3 className="text-lg font-bold text-slate-900 mb-4">Add a Question</h3>
      <div className="space-y-2">
        {questionTypes.map((qType) => (
          <Button
            key={qType.type}
            variant="ghost"
            className="w-full justify-start h-12 text-base"
            onClick={() => onSelectType(qType.type)}
          >
            <qType.icon className="w-5 h-5 mr-3 text-slate-500" />
            {qType.label}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}

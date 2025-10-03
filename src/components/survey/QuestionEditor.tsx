'use client';
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QuestionEditor({ question: initialQuestion, onSave, onCancel }: { question: any, onSave: (q: any) => void, onCancel: () => void }) {
  const [question, setQuestion] = useState(initialQuestion);

  useEffect(() => {
    setQuestion(initialQuestion);
  }, [initialQuestion]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    setQuestion({ ...question, options: newOptions });
  };

  const addOption = () => {
    const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
    setQuestion({ ...question, options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = (question.options || []).filter((_, i) => i !== index);
    setQuestion({ ...question, options: newOptions });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border-2 border-primary"
    >
      <h3 className="text-xl font-bold text-slate-900 mb-4">
        {question.id ? 'Edit Question' : 'Add New Question'}
      </h3>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Question Text *
          </label>
          <Textarea
            value={question.question}
            onChange={(e) => setQuestion({ ...question, question: e.target.value })}
            placeholder="e.g. How satisfied are you with our service?"
            rows={2}
            className="rounded-xl"
          />
        </div>
        
        {['single_selection', 'multiple_selection', 'dropdown'].includes(question.type) && (
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Options
            </label>
            <div className="space-y-2">
              {question.options.map((opt: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeOption(index)}>
                    <X className="w-4 h-4 text-slate-500" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOption}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Option
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(question)}>Save Question</Button>
        </div>
      </div>
    </motion.div>
  );
}

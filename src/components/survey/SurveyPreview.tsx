'use client';
import React from 'react';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { type Question } from '@/entities/Survey';

// Dummy question components for preview
const PreviewQuestion = ({ question }: { question: Question }) => (
  <div className="mb-6 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
    <h4 className="font-semibold text-lg mb-4 text-slate-800">{question.title || question.text}</h4>
    <div className="text-slate-600">
      {/* This is a simplified preview. A full implementation would render the actual question type. */}
      <p>Type: {question.type}</p>
      {question.options && question.options.length > 0 && (
        <ul className="list-disc list-inside mt-2">
          {question.options.map((opt: string, i: number) => <li key={i}>{opt}</li>)}
        </ul>
      )}
    </div>
  </div>
);

export default function SurveyPreview({ title, description, questions, onClose }: { title: string, description: string, questions: any[], onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-50 rounded-2xl w-full max-w-2xl h-[90vh] flex flex-col"
      >
        <header className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Survey Preview</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
            <p className="text-slate-600">{description}</p>
          </div>
          
          <AnimatePresence>
            {questions.map((q, index) => (
              <motion.div
                key={q.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: index * 0.1 } }}
              >
                <PreviewQuestion question={q} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

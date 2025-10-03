'use client';
import React from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { GripVertical, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Question } from '@/entities/Survey';

const SortableItem = ({ id, question, onEdit, onDelete }: { id: string, question: Question, onEdit: (q: Question) => void, onDelete: (id: string) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layoutId={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-4"
    >
      <button {...attributes} {...listeners} className="cursor-grab p-2 text-slate-400 hover:text-slate-600">
        <GripVertical className="w-5 h-5" />
      </button>
      <div className="flex-1">
        <p className="font-semibold text-slate-800">{question.title || question.text}</p>
        <p className="text-sm text-slate-500">{question.type}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={() => onEdit(question)} className="rounded-xl">
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="destructive" size="icon" onClick={() => onDelete(id)} className="rounded-xl">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default function QuestionList({ questions, onEdit, onDelete, onReorder }: { questions: Question[], onEdit: (q: Question) => void, onDelete: (id: string) => void, onReorder: (start: number, end: number) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = questions.findIndex(q => q.id === active.id);
      const newIndex = questions.findIndex(q => q.id === over.id);
      onReorder(oldIndex, newIndex);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          <AnimatePresence>
            {questions.map((q) => (
              <SortableItem key={q.id} id={q.id} question={q} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
    </DndContext>
  );
}

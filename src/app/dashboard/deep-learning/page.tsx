
'use client';

import DeepLearningApp from '@/components/deep-learning-app';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export default function DeepLearningPage() {
  return (
    <DndProvider backend={HTML5Backend}>
      <DeepLearningApp />
    </DndProvider>
  );
}

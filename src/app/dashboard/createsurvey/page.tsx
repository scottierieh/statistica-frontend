'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const CreateSurveyContent = dynamic(() => import('@/components/CreateSurveyPage'), { ssr: false });

export default function CreateSurveyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <CreateSurveyContent />
    </Suspense>
  );
}
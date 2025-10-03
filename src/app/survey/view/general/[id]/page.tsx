'use client';

import { Suspense } from 'react';
import SurveyView from '@/components/survey-view';
import { useSearchParams } from 'next/navigation';


function SurveyPageContent() {
    const searchParams = useSearchParams();
    // In a real app, you'd fetch this from a database using the id.
    // For this prototype, we'll rely on the parent window or local storage.
    return <SurveyView />;
}


export default function SurveyPage() {
  return (
    <Suspense fallback={<div>Loading survey...</div>}>
      <SurveyPageContent />
    </Suspense>
  );
}

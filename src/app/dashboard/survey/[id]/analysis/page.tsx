
'use client';
import { Suspense } from 'react';
import SurveyAnalysisPage from '@/components/survey-analysis';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SurveyAnalysisPage />
    </Suspense>
  );
}

'use client';
import { Suspense } from 'react';
import SurveyAnalysisPage from '@/components/pages/survey-analysis-page';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SurveyAnalysisPage />
    </Suspense>
  );
}

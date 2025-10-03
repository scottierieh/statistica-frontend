'use client';

import { Suspense } from 'react';
import SurveyView from '@/components/survey-view';

export default function SurveyPage() {
  return (
    <Suspense fallback={<div>Loading survey...</div>}>
      <SurveyView />
    </Suspense>
  );
}

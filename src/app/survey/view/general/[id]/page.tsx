
'use client';

import { Suspense } from 'react';
import SurveyView from '@/components/survey-view';

export default function SurveyPage() {
  return (
    <Suspense fallback={<div>Loading survey...</div>}>
      <div className="min-h-screen bg-muted/30 flex justify-center p-0 md:p-4">
        <div className="w-full md:max-w-5xl bg-white md:shadow-2xl md:rounded-lg">
          <SurveyView />
        </div>
      </div>
    </Suspense>
  );
}

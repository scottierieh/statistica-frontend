
'use client';

import { Suspense } from 'react';
import SurveyView from '@/components/survey-view';

export default function SurveyPage() {
  return (
    <Suspense fallback={<div>Loading survey...</div>}>
      <div className="min-h-screen bg-muted/30 flex justify-center p-0 md:p-4">
        <div className="w-full md:w-[794px] md:h-[1123px] md:p-0 bg-white md:shadow-2xl md:rounded-lg md:scale-[0.8] md:origin-top">
          <SurveyView />
        </div>
      </div>
    </Suspense>
  );
}

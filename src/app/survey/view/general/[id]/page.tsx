'use client';

import { Suspense } from 'react';
import SurveyView from '@/components/survey-view';

export default function SurveyPage() {
  return (
    <Suspense fallback={<div>Loading survey...</div>}>
      <div className="min-h-screen bg-muted/30 flex justify-center p-0 md:p-4">
        <div className="w-[794px] h-[1123px] p-0 bg-white shadow-2xl rounded-lg scale-[0.85] origin-top">
          <SurveyView />
        </div>
      </div>
    </Suspense>
  );
}

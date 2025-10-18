'use client';

import React, { Suspense } from 'react';
import SurveyApp from '@/components/survey-app';

export default function CreateSurveyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SurveyApp />
    </Suspense>
  );
}

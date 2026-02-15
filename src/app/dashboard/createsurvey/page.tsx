import { Suspense } from 'react';
import dynamicImport from 'next/dynamic';

export const dynamic = 'force-dynamic';

const CreateSurveyContent = dynamicImport(() => import('@/components/CreateSurveyPage'), { ssr: false });

export default function CreateSurveyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <CreateSurveyContent />
    </Suspense>
  );
}
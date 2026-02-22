// src/hooks/use-feature-access.ts
'use client';

import { useAuth } from './use-auth';
import { featureAccess, exportAccess, freeExportAnalyses, type FeaturePlan } from '@/lib/feature-plans';

const planLevels: Record<FeaturePlan, number> = {
  free: 0,
  plus: 1,
  pro: 2,
};

// 분석 기능 접근 권한 체크
export function useFeatureAccess(featureId: string): { hasAccess: boolean; requiredPlan: FeaturePlan | null } {
  const { user } = useAuth();

  const requiredPlan = featureAccess[featureId] || null;

  if (!user || !requiredPlan) {
    return { hasAccess: false, requiredPlan };
  }

  const userPlanLevel = planLevels[(user as any).plan as FeaturePlan] ?? -1;
  const requiredPlanLevel = planLevels[requiredPlan] ?? 99;

  const hasAccess = userPlanLevel >= requiredPlanLevel;

  return { hasAccess, requiredPlan };
}

// Export 기능 접근 권한 체크
export function useExportAccess(
  exportType: 'csv' | 'png' | 'docx' | 'python',
  analysisId: string
): { hasAccess: boolean; requiredPlan: FeaturePlan } {
  const { user } = useAuth();

  const baseRequiredPlan = exportAccess[exportType] || 'pro';
  
  // 이 분석이 무료 export 허용 목록에 있으면 무료
  const isFreeExportAnalysis = freeExportAnalyses.includes(analysisId);
  
  if (isFreeExportAnalysis) {
    return { hasAccess: true, requiredPlan: 'free' };
  }

  if (!user) {
    return { hasAccess: false, requiredPlan: baseRequiredPlan };
  }

  const userPlanLevel = planLevels[(user as any).plan as FeaturePlan] ?? -1;
  const requiredPlanLevel = planLevels[baseRequiredPlan] ?? 99;

  const hasAccess = userPlanLevel >= requiredPlanLevel;

  return { hasAccess, requiredPlan: baseRequiredPlan };
}
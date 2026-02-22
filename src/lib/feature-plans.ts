export type FeaturePlan = 'free' | 'plus' | 'pro';

export const featureAccess: Record<string, FeaturePlan> = {};
export const exportAccess: Record<string, FeaturePlan> = {};
export const freeExportAnalyses: string[] = [];

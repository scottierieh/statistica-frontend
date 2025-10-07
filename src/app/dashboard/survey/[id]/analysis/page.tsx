
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import SurveyAnalysisPage from '@/components/pages/survey-analysis-page';
import type { Survey, SurveyResponse } from '@/types/survey';
import { Skeleton } from '@/components/ui/skeleton';
import AhpPage from '@/components/pages/ahp-page';
import CbcAnalysisPage from '@/components/pages/cbc-analysis-page';
import RatingConjointAnalysisPage from '@/components/pages/rating-conjoint-analysis-page';
import IpaPage from '@/components/pages/ipa-page';
import VanWestendorpPage from '@/components/pages/van-westendorp-page';
import TurfPage from '@/components/pages/turf-page';

export default function SurveyAnalysis() {
    const params = useParams();
    const searchParams = useSearchParams();
    const surveyId = params.id as string;
    const analysisType = searchParams.get('type');

    const [survey, setSurvey] = useState<Survey | null>(null);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (surveyId && surveyId !== 'new') {
            setLoading(true);
            try {
                const storedSurveys = JSON.parse(localStorage.getItem('surveys') || '[]');
                const currentSurvey = storedSurveys.find((s: any) => s.id === surveyId);
                setSurvey(currentSurvey || null);

                const storedResponses = JSON.parse(localStorage.getItem(`${surveyId}_responses`) || '[]');
                setResponses(storedResponses);
            } catch (error) {
                console.error("Failed to load survey data:", error);
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, [surveyId]);

    const analysisComponent = useMemo(() => {
        if (analysisType === 'ahp') {
            return <AhpPage survey={survey} responses={responses} />;
        }
        
        if (!survey) return null;

        const hasConjoint = survey.questions.some(q => q.type === 'conjoint');
        const hasRatingConjoint = survey.questions.some(q => q.type === 'rating-conjoint');
        const hasIPA = survey.questions.some(q => q.type === 'matrix' && q.rows?.some(r => r.toLowerCase().includes('overall')));
        const hasVanWestendorp = survey.questions.some(q => q.title.toLowerCase().includes('too cheap'));
        const hasTurf = survey.questions.some(q => q.type === 'multiple');
        const hasAHP = survey.questions.some(q => q.type === 'ahp');

        if (hasAHP) return <AhpPage survey={survey} responses={responses} />;
        if (hasConjoint) return <CbcAnalysisPage survey={survey} responses={responses} />;
        if (hasRatingConjoint) return <RatingConjointAnalysisPage survey={survey} responses={responses} />;
        if (hasIPA) return <IpaPage survey={survey} responses={responses} />;
        if (hasVanWestendorp) return <VanWestendorpPage survey={survey} responses={responses} />;
        if (hasTurf) return <TurfPage survey={survey} responses={responses} />;
        
        return <SurveyAnalysisPage survey={survey} responses={responses} />;
    }, [survey, responses, analysisType]);

    if (loading) {
        return (
            <div className="p-6">
                <Skeleton className="h-10 w-1/4 mb-4" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!survey && surveyId !== 'new') {
        return <div>Survey not found.</div>;
    }
    
    if (analysisType === 'ahp' && surveyId === 'new') {
        return <AhpPage survey={null} responses={[]} />;
    }
    
    if (!analysisComponent) {
        return <div>Determining analysis type...</div>
    }

    return analysisComponent;
}

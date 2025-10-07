
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SurveyAnalysisPage from '@/components/pages/survey-analysis-page';
import type { Survey, SurveyResponse } from '@/types/survey';
import { Skeleton } from '@/components/ui/skeleton';

export default function SurveyAnalysis() {
    const params = useParams();
    const surveyId = params.id as string;
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (surveyId) {
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
        }
    }, [surveyId]);

    if (loading) {
        return (
            <div className="p-6">
                <Skeleton className="h-10 w-1/4 mb-4" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!survey) {
        return <div>Survey not found.</div>;
    }

    return <SurveyAnalysisPage survey={survey} responses={responses} />;
}

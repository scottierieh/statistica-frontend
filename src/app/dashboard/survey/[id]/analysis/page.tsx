
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import SurveyAnalysisPage from '@/components/pages/survey-analysis-page';
import type { Survey, SurveyResponse } from '@/types/survey';
import { Skeleton } from '@/components/ui/skeleton';
import CbcAnalysisPage from '@/components/pages/cbc-analysis-page';
import RatingConjointAnalysisPage from '@/components/pages/rating-conjoint-analysis-page';
import IpaPage from '@/components/pages/ipa-page';
import VanWestendorpPage from '@/components/pages/van-westendorp-page';
import TurfPage from '@/components/pages/turf-page';

export default function SurveyAnalysis() {
    const params = useParams();
    const surveyId = params.id as string;

    const [survey, setSurvey] = useState<Survey | null>(null);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (surveyId) {
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

    const specialAnalyses = useMemo(() => {
        if (!survey) return [];
        const analyses = [];
        if (survey.questions.some(q => q.type === 'conjoint')) {
            analyses.push({ key: 'conjoint', label: 'Conjoint (CBC)', component: <CbcAnalysisPage survey={survey} responses={responses} /> });
        }
        if (survey.questions.some(q => q.type === 'rating-conjoint')) {
             analyses.push({ key: 'rating-conjoint', label: 'Conjoint (Rating)', component: <RatingConjointAnalysisPage survey={survey} responses={responses} /> });
        }
        if (survey.questions.some(q => q.type === 'matrix' && q.rows?.some(r => r.toLowerCase().includes('overall')))) {
            analyses.push({ key: 'ipa', label: 'IPA', component: <IpaPage survey={survey} responses={responses} /> });
        }
        if (survey.questions.some(q => ['too cheap', 'cheap', 'expensive', 'too expensive'].every(keyword => survey.questions.some(q => q.title.toLowerCase().includes(keyword))))) {
            analyses.push({ key: 'van-westendorp', label: 'Price Sensitivity', component: <VanWestendorpPage survey={survey} responses={responses} /> });
        }
        const turfQuestion = survey.questions.find(q => q.type === 'multiple');
        if (turfQuestion) {
            const turfData = responses.map(r => ({ selection: (r.answers as any)[turfQuestion.id] })).filter(r => r.selection);
            if (turfData.length > 0) {
                 analyses.push({ key: 'turf', label: 'TURF Analysis', component: <TurfPage data={turfData} categoricalHeaders={[turfQuestion.title]} onLoadExample={() => {}} /> });
            }
        }
        return analyses;
    }, [survey, responses]);

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

    return (
        <SurveyAnalysisPage survey={survey} responses={responses} specialAnalyses={specialAnalyses} />
    );
}

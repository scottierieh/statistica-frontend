'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SurveyAnalysisPage from '@/components/survey/analysis/SurveyAnalysisPage';
import type { Survey, SurveyResponse } from '@/entities/Survey';
import { Skeleton } from '@/components/ui/skeleton';
import { initializeFirebase } from '@/firebase';
import { surveyService } from '@/services/survey-service';
import { useToast } from '@/hooks/use-toast';

export default function SurveyAnalysis() {
    const params = useParams();
    const { toast } = useToast();
    const { firestore } = initializeFirebase();
    const surveyId = params.id as string;

    const [survey, setSurvey] = useState<Survey | null>(null);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!surveyId) return;
            setLoading(true);
            try {
                const loadedSurvey = await surveyService.getSurvey(firestore, surveyId);
                const loadedResponses = await surveyService.getResponses(firestore, surveyId);
                setSurvey(loadedSurvey);
                setResponses(loadedResponses);
            } catch (e) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load analysis data.' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [surveyId, firestore, toast]);

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!survey) return <div>Survey not found.</div>;

    return (
        <SurveyAnalysisPage 
          survey={survey} 
          responses={responses} 
          specialAnalyses={[]} 
        />
    );
}
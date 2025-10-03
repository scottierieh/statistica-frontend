
'use client';
import { motion } from "framer-motion";
import { Lightbulb, TrendingUp } from "lucide-react";
import { Survey, SurveyResponse } from "@/types/survey";

interface AIAnalysisCardProps {
    surveys: Survey[];
    responses: SurveyResponse[];
}

export default function AIAnalysisCard({ surveys, responses }: AIAnalysisCardProps) {
    // Simple placeholder logic
    const mostRespondedSurvey = surveys.reduce((prev, current) => {
        const prevResponses = responses.filter(r => r.survey_id === prev.id).length;
        const currentResponses = responses.filter(r => r.survey_id === current.id).length;
        return (prevResponses > currentResponses) ? prev : current;
    }, surveys[0]);
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-10 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-8"
        >
            <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-shrink-0">
                    <Lightbulb className="w-16 h-16 text-yellow-400" />
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-3">AI-Powered Insights</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-300">
                        <div className="flex items-start gap-3 p-4 bg-slate-700/50 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-green-400 mt-1" />
                            <div>
                                <h4 className="font-semibold text-white">Top Performing Survey</h4>
                                <p>'{mostRespondedSurvey?.name}' is currently receiving the most engagement.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-slate-700/50 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-yellow-400 mt-1" />
                             <div>
                                <h4 className="font-semibold text-white">Suggestion</h4>
                                <p>Consider analyzing the qualitative feedback from closed surveys to identify common themes.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

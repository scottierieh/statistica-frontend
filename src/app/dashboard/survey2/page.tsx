
'use client';

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, BarChart3, Users, FileText, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import StatsCard from "@/components/dashboard/survey2/StatsCard";
import SurveyCard from "@/components/dashboard/survey2/SurveyCard";
import EmptyState from "@/components/dashboard/survey2/EmptyState";
import AIAnalysisCard from "@/components/dashboard/survey2/AIAnalysisCard";
import type { Survey, SurveyResponse } from '@/types/survey';

export default function Survey2Dashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    // Simulating an API call latency
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const storedSurveys = JSON.parse(localStorage.getItem('surveys') || '[]') as Survey[];
      const allResponses: SurveyResponse[] = [];
      
      storedSurveys.forEach(survey => {
        const surveyResponses = JSON.parse(localStorage.getItem(`${survey.id}_responses`) || '[]');
        allResponses.push(...surveyResponses);
      });

      setSurveys(storedSurveys.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()));
      setResponses(allResponses);
    } catch (e) {
      console.error("Failed to load data from localStorage", e);
      // Handle potential JSON parsing errors, etc.
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSurveyUpdate = (updatedSurvey: Survey) => {
    setSurveys(prevSurveys => 
      prevSurveys.map(s => s.id === updatedSurvey.id ? updatedSurvey : s)
    );
  };

  const filteredSurveys = filter === "all" 
    ? surveys 
    : surveys.filter(s => s.status === filter);

  const totalResponses = responses.length;
  const activeSurveys = surveys.filter(s => s.status === "active").length;
  const avgResponseRate = surveys.length > 0 
    ? (totalResponses / surveys.length).toFixed(1) 
    : "0";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Survey Dashboard
            </h1>
            <p className="text-slate-600">Manage surveys and analyze results</p>
          </div>
          <Link href="/dashboard/createsurvey">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white shadow-lg shadow-cyan-500/30 gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New Survey
            </Button>
          </Link>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatsCard
          title="Total Surveys"
          value={surveys.length.toString()}
          icon={FileText}
          gradient="from-blue-400 to-cyan-400"
          trend={`${activeSurveys} active`}
        />
        <StatsCard
          title="Total Responses"
          value={totalResponses.toString()}
          icon={Users}
          gradient="from-purple-400 to-pink-400"
          trend="This month"
        />
        <StatsCard
          title="Avg Response Rate"
          value={`${avgResponseRate}`}
          icon={TrendingUp}
          gradient="from-emerald-400 to-teal-400"
          suffix="/survey"
        />
        <StatsCard
          title="Active Surveys"
          value={activeSurveys.toString()}
          icon={BarChart3}
          gradient="from-orange-400 to-amber-400"
        />
      </div>

      {surveys.length > 0 && responses.length > 0 && (
        <AIAnalysisCard surveys={surveys} responses={responses} />
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: "all", label: "All" },
          { key: "active", label: "Active" },
          { key: "draft", label: "Draft" },
          { key: "closed", label: "Closed" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
              filter === tab.key
                ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/30"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-6" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : filteredSurveys.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredSurveys.map((survey) => (
              <SurveyCard
                key={survey.id}
                survey={survey}
                responses={responses.filter(r => r.survey_id === survey.id)}
                onUpdate={handleSurveyUpdate}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, BarChart3, Users, FileText, TrendingUp, ClipboardList, Handshake, ShieldCheck, DollarSign, Target, Network } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import StatsCard from "@/components/dashboard/survey2/StatsCard";
import SurveyCard from "@/components/dashboard/survey2/SurveyCard";
import EmptyState from "@/components/dashboard/survey2/EmptyState";
import type { Survey, SurveyResponse } from '@/types/survey';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ipaTemplate, choiceBasedConjointTemplate, ratingBasedConjointTemplate, vanWestendorpTemplate, turfTemplate, gaborGrangerTemplate, ahpCriteriaOnlyTemplate, ahpWithAlternativesTemplate } from "@/lib/survey-templates";

const TemplateCard = ({ icon: Icon, title, description, href }: { icon: React.ElementType, title: string, description: string, href: string }) => (
    <Link href={href} className="block">
        <div className="p-4 border rounded-lg hover:bg-accent hover:shadow-md transition-all h-full flex flex-col">
            <div className="flex items-center gap-3 mb-2">
                <Icon className="w-6 h-6 text-primary"/>
                <h4 className="font-semibold">{title}</h4>
            </div>
            <p className="text-xs text-muted-foreground flex-1">{description}</p>
             <Button variant="link" size="sm" className="mt-2 p-0 h-auto self-start">Use Template</Button>
        </div>
    </Link>
);


export default function Survey2Dashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

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
    : surveys.filter(s => {
        const now = new Date();
        const startDate = s.startDate ? new Date(s.startDate) : null;
        const endDate = s.endDate ? new Date(s.endDate) : null;

        let effectiveStatus = s.status;

        if (s.status !== 'closed') {
            if (startDate && now < startDate) {
                effectiveStatus = 'scheduled';
            } else if (endDate && now > endDate) {
                effectiveStatus = 'closed';
            } else if (startDate && (!endDate || now <= endDate)) {
                effectiveStatus = 'active';
            }
        }
        return effectiveStatus === filter;
    });

  const totalResponses = responses.length;
  const activeSurveys = surveys.filter(s => {
      const now = new Date();
      const startDate = s.startDate ? new Date(s.startDate) : null;
      const endDate = s.endDate ? new Date(s.endDate) : null;
      if (s.status === 'closed') return false;
      if (startDate && now < startDate) return false;
      if (endDate && now > endDate) return false;
      return s.status === 'active' || (s.status === 'draft' && !!s.startDate);
  }).length;
  
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
           <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
                 <Button size="lg" className="gap-2">
                    <Plus className="w-5 h-5" />
                    Create New Survey
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Create a New Survey</DialogTitle>
                    <DialogDescription>Start from scratch or use one of our expert-designed templates.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                     <Link href="/dashboard/createsurvey">
                        <div className="p-6 mb-6 rounded-lg border bg-card hover:bg-accent cursor-pointer">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><Plus className="w-5 h-5"/>Start from Scratch</h3>
                            <p className="text-sm text-muted-foreground">Build a custom survey for your specific needs.</p>
                        </div>
                    </Link>
                    <h4 className="font-semibold mb-4">Or use a template</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         <TemplateCard icon={Target} title="IPA Survey" description="Measure Importance vs. Performance to find key improvement areas." href="/dashboard/createsurvey?template=ipa"/>
                         <TemplateCard icon={Handshake} title="Choice-Based Conjoint" description="Understand how customers value different attributes of a product using choices." href="/dashboard/createsurvey?template=cbc"/>
                         <TemplateCard icon={ClipboardList} title="Rating Conjoint" description="Analyze customer preferences using a rating-based approach." href="/dashboard/createsurvey?template=rating-conjoint"/>
                         <TemplateCard icon={ShieldCheck} title="NPS Survey" description="Measure customer loyalty with the Net Promoter Score." href="/dashboard/createsurvey?template=nps"/>
                         <TemplateCard icon={DollarSign} title="Price Sensitivity (PSM)" description="Use the Van Westendorp model to find optimal price points." href="/dashboard/createsurvey?template=van-westendorp"/>
                         <TemplateCard icon={DollarSign} title="Gabor-Granger" description="Determine price elasticity by asking direct purchase likelihood questions." href="/dashboard/createsurvey?template=gabor-granger"/>
                         <TemplateCard icon={Users} title="TURF Analysis" description="Identify the best combination of items to maximize reach." href="/dashboard/createsurvey?template=turf"/>
                         <TemplateCard icon={Network} title="AHP (Criteria Only)" description="Prioritize criteria using pairwise comparisons." href="/dashboard/createsurvey?template=ahp-criteria"/>
                         <TemplateCard icon={Network} title="AHP (Full)" description="Make complex decisions by comparing criteria and alternatives." href="/dashboard/createsurvey?template=ahp-full"/>
                    </div>
                </div>
            </DialogContent>
           </Dialog>
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
                ? tab.key === 'all'
                  ? 'bg-slate-700 text-white shadow-lg'
                  : 'bg-primary text-primary-foreground shadow-lg'
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
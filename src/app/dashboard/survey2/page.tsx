'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  Plus, 
  BarChart3, 
  Users, 
  FileText, 
  TrendingUp, 
  Loader2,
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Columns,
  Sigma
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StatsCard from "@/app/dashboard/survey2/StatsCard";
import SurveyCard from "@/app/dashboard/survey2/SurveyCard";
import EmptyState from "@/app/dashboard/survey2/EmptyState";
import type { Survey, SurveyResponse } from '@/types/survey';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { initializeFirebase } from "@/firebase";
import { surveyService } from "@/services/survey-service";
import { useAuth } from "@/hooks/use-auth";

// Analyst Toolkit Data for Slider
const analysisSlides = [
    {
        id: 'descriptive',
        icon: Sigma,
        title: 'Descriptive & Frequency',
        description: 'Get a quick overview of your data with mean, standard deviation, and frequency distributions for each variable.',
        badge: 'Descriptive',
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-100'
    },
    {
        id: 'crosstab',
        icon: Columns,
        title: 'Crosstab & Chi-Squared',
        description: 'Examine relationships between categorical variables like gender and product preference using Chi-squared tests.',
        badge: 'Relationship',
        color: 'text-purple-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-100'
    },
    {
        id: 'correlation',
        icon: Activity,
        title: 'Correlation Analysis',
        description: 'Quantify the strength and direction of linear relationships between your numeric survey ratings.',
        badge: 'Relationship',
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-100'
    },
    {
        id: 'differences',
        icon: Users,
        title: 'T-Tests & ANOVA',
        description: 'Determine if differences between groups (e.g., age groups, regions) are statistically significant.',
        badge: 'Comparison',
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-100'
    },
    {
        id: 'regression',
        icon: TrendingUp,
        title: 'Linear & Logistic',
        description: 'Identify key drivers of outcomes and build models to predict behavior like purchase intent or churn.',
        badge: 'Predictive',
        color: 'text-rose-500',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-100'
    },
    {
        id: 'structural',
        icon: ShieldCheck,
        title: 'Factor & Reliability',
        description: 'Check survey reliability with Cronbach\'s Alpha and uncover latent structures with Factor Analysis.',
        badge: 'Structural',
        color: 'text-cyan-500',
        bgColor: 'bg-cyan-50',
        borderColor: 'border-cyan-100'
    }
];

// Analyst Toolkit Slider Component
function AnalystToolkitSlider() {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4000, stopOnInteraction: false })]);

    const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

    return (
        <div className="mb-10 py-10 bg-gradient-to-br from-slate-50 via-white to-blue-50/20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 rounded-2xl border border-slate-100">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-end justify-between mb-8">
                    <div className="text-left">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-widest text-primary">Analyst Toolkit</span>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 font-headline">
                            Professional Statistical Analysis
                        </h2>
                        <p className="text-slate-600 mt-2 text-sm max-w-xl">
                            Unlock the full potential of your survey data with professional-grade statistical models.
                        </p>
                    </div>
                    <div className="flex gap-2 mb-1">
                        <Button variant="outline" size="icon" onClick={scrollPrev} className="rounded-full h-9 w-9 bg-white">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={scrollNext} className="rounded-full h-9 w-9 bg-white">
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden" ref={emblaRef}>
                    <div className="flex">
                        {analysisSlides.map((slide) => {
                            const Icon = slide.icon;
                            return (
                                <div key={slide.id} className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] px-3">
                                    <Card className={cn(
                                        "h-full border shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20",
                                        slide.borderColor
                                    )}>
                                        <CardHeader className={cn("pb-4", slide.bgColor)}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className={cn("p-2 rounded-lg bg-white shadow-sm", slide.color)}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <Badge variant="secondary" className="bg-white/80 text-[10px] font-bold uppercase tracking-tighter">
                                                    {slide.badge}
                                                </Badge>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Analysis</p>
                                                <CardTitle className="text-xl font-bold">{slide.title}</CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-5 flex flex-col justify-between h-[180px]">
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                {slide.description}
                                            </p>
                                            <div className="pt-4 border-t border-slate-50">
                                                <Button asChild variant="ghost" className="w-full group hover:bg-primary hover:text-white transition-all duration-300">
                                                    <Link href="/dashboard/statistica" className="flex items-center justify-between w-full">
                                                        <span className="text-sm font-semibold">Try in Statistica</span>
                                                        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Survey2Dashboard() {
  const { user } = useAuth();
  const { firestore } = initializeFirebase();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responsesMap, setResponsesMap] = useState<Record<string, SurveyResponse[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedSurveys, setSelectedSurveys] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fetchedSurveys = await surveyService.getSurveys(firestore, user.email);
      setSurveys(fetchedSurveys);
      
      const newResponsesMap: Record<string, SurveyResponse[]> = {};
      for (const survey of fetchedSurveys) {
        const surveyResponses = await surveyService.getResponses(firestore, survey.id);
        newResponsesMap[survey.id] = surveyResponses;
      }
      setResponsesMap(newResponsesMap);
    } catch (e) {
      console.error("Failed to load data from Firestore", e);
      toast({ variant: 'destructive', title: 'Loading Error', description: 'Could not fetch your surveys.' });
    } finally {
      setIsLoading(false);
    }
  }, [user, firestore, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleSurveyUpdate = async (updatedSurvey: Survey) => {
    if (!user) return;
    try {
      await surveyService.saveSurvey(firestore, updatedSurvey, user.email);
      setSurveys(prev => prev.map(s => s.id === updatedSurvey.id ? updatedSurvey : s));
      toast({ title: 'Survey Updated' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Update Error', description: 'Could not update survey.' });
    }
  };

  const handleDuplicateSurvey = async (surveyId: string) => {
    if (!user) return;
    const surveyToCopy = surveys.find(s => s.id === surveyId);
    if (surveyToCopy) {
      const newSurvey = {
        ...surveyToCopy,
        id: undefined,
        title: `${surveyToCopy.title} (Copy)`,
        status: 'draft' as const,
        created_date: new Date().toISOString(),
      };
      try {
        await surveyService.saveSurvey(firestore, newSurvey, user.email);
        loadData();
        toast({ title: 'Survey Duplicated' });
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not duplicate survey.' });
      }
    }
  };

  const handleToggleSelection = (surveyId: string) => {
    setSelectedSurveys(prev =>
        prev.includes(surveyId)
            ? prev.filter(id => id !== surveyId)
            : [...prev, surveyId]
    );
  };

  const filteredSurveys = useMemo(() => {
    return surveys.filter(s => {
        const statusFilter = filter === "all" ? true : (() => {
          const now = new Date();
          const startDate = s.startDate ? new Date(s.startDate) : null;
          const endDate = s.endDate ? new Date(s.endDate) : null;
          let effectiveStatus = s.status;

          if (s.status === 'closed') {
              return filter === 'closed';
          }
          if (s.status === 'active') {
              if (startDate && now < startDate) effectiveStatus = 'scheduled';
              else if (endDate && now > endDate) effectiveStatus = 'closed';
              else if (!startDate) effectiveStatus = 'draft';
              else effectiveStatus = 'active';
          }
          return effectiveStatus === filter;
        })();
        
        const searchFilter = searchQuery === '' ? true : s.title.toLowerCase().includes(searchQuery.toLowerCase());
        
        return statusFilter && searchFilter;
    });
  }, [surveys, filter, searchQuery]);

  const totalPages = Math.ceil(filteredSurveys.length / itemsPerPage);
  const paginatedSurveys = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSurveys.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSurveys, currentPage, itemsPerPage]);
  
  const emptyRows = itemsPerPage - paginatedSurveys.length;

  const totalResponsesCount = Object.values(responsesMap).reduce((acc, curr) => acc + curr.length, 0);
  const activeSurveysCount = surveys.filter(s => {
      const now = new Date();
      const startDate = s.startDate ? new Date(s.startDate) : null;
      const endDate = s.endDate ? new Date(s.endDate) : null;
      if (s.status !== 'active' || !startDate || now < startDate) return false;
      if (endDate && now > endDate) return false;
      return true;
  }).length;
  
  const avgResponseRate = surveys.length > 0 
    ? (totalResponsesCount / surveys.length).toFixed(1) 
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
          
          <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-shadow" asChild>
            <Link href="/dashboard/createsurvey">
              <Plus className="w-5 h-5" />
              Create New Survey
            </Link>
          </Button>
        </motion.div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatsCard title="Total Surveys" value={surveys.length.toString()} icon={FileText} gradient="from-blue-400 to-cyan-400" subtext={`${activeSurveysCount} active`} />
        <StatsCard title="Total Responses" value={totalResponsesCount.toString()} icon={Users} gradient="from-purple-400 to-pink-400" subtext="All time" />
        <StatsCard title="Avg Response Rate" value={`${avgResponseRate}`} icon={TrendingUp} gradient="from-emerald-400 to-teal-400" suffix="/survey" />
        <StatsCard title="Active Surveys" value={activeSurveysCount.toString()} icon={BarChart3} gradient="from-orange-400 to-amber-400" />
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
            {[ { key: "all", label: "All" }, { key: "active", label: "Active" }, { key: "draft", label: "Draft" }, { key: "closed", label: "Closed" } ].map((tab) => (
            <button key={tab.key} onClick={() => { setFilter(tab.key); setCurrentPage(1); }} className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${ filter === tab.key ? 'bg-primary text-primary-foreground shadow-lg' : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200" }`}>
                {tab.label}
            </button>
            ))}
        </div>
        <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search surveys..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-0"><div className="p-12 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div></CardContent></Card>
      ) : filteredSurveys.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <Card className="mb-10">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-4 w-12"><Checkbox checked={selectedSurveys.length > 0 && selectedSurveys.length === paginatedSurveys.length} onCheckedChange={(checked) => setSelectedSurveys(checked ? paginatedSurveys.map(s => s.id) : [])} /></TableHead>
                                <TableHead className="w-[40%] min-w-[250px]">Survey</TableHead>
                                <TableHead className="w-[100px]">Template</TableHead>
                                <TableHead className="w-[90px]">Status</TableHead>
                                <TableHead className="text-center w-[90px]">Responses</TableHead>
                                <TableHead className="w-[120px]">Date Created</TableHead>
                                <TableHead className="text-right w-[150px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence>
                            {paginatedSurveys.map((survey) => (
                                <SurveyCard
                                    key={survey.id}
                                    survey={survey}
                                    responses={responsesMap[survey.id] || []}
                                    onUpdate={handleSurveyUpdate}
                                    onDuplicate={handleDuplicateSurvey}
                                    isSelected={selectedSurveys.includes(survey.id)}
                                    onToggleSelect={() => handleToggleSelection(survey.id)}
                                />
                            ))}
                             {emptyRows > 0 && Array.from({ length: emptyRows }).map((_, index) => (
                                <TableRow key={`empty-${index}`} className="h-[73px]">
                                    <td colSpan={7}></td>
                                </TableRow>
                            ))}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
        </Card>
      )}

      <AnalystToolkitSlider />
    </div>
  );
}
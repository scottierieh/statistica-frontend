'use client';

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, BarChart3, Users, FileText, TrendingUp, ClipboardList, Handshake, ShieldCheck, DollarSign, Target, Network, Replace, Activity, Trash2, AlertCircle, CheckSquare, Gauge, ArrowDownUp, Sparkles, Zap, Star, Search } from "lucide-react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ipaTemplate, choiceBasedConjointTemplate, ratingBasedConjointTemplate, vanWestendorpTemplate, turfTemplate, gaborGrangerTemplate1, gaborGrangerTemplate2, ahpCriteriaOnlyTemplate, ahpWithAlternativesTemplate, csatTemplate, semanticDifferentialTemplate, brandFunnelTemplate, servqualTemplate, servperfTemplate, rankingConjointTemplate } from "@/lib/survey-templates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const TemplateCarousel = () => {
    const autoplayPlugin = React.useRef(Autoplay({ delay: 4000, stopOnInteraction: true }));

    const carouselItems = [
        {
            title: "IPA Survey Templates",
            description: "Professional survey templates for Importance-Performance Analysis",
            href: "/dashboard/createsurvey?template=ipa",
            image: PlaceHolderImages.find(img => img.id === "ipa-banner"),
            gradient: "from-slate-50 to-slate-100",
            textColor: "text-slate-800",
            buttonColor: "bg-slate-700 hover:bg-slate-800 text-white"
        },
        {
            title: "Customer Satisfaction Survey",
            description: "Measure customer satisfaction with pre-built CSAT templates",
            href: "/dashboard/createsurvey?template=csat",
            image: PlaceHolderImages.find(img => img.id === "csat-banner"),
            gradient: "from-amber-50 to-yellow-100",
            textColor: "text-amber-800",
            buttonColor: "bg-amber-500 hover:bg-amber-600 text-white"
        },
        {
            title: "Employee Engagement Survey",
            description: "Boost team morale with comprehensive engagement surveys",
            href: "#",
            image: PlaceHolderImages.find(img => img.id === "engagement-banner"),
            gradient: "from-blue-50 to-blue-100",
            textColor: "text-blue-800",
            buttonColor: "bg-blue-500 hover:bg-blue-600 text-white"
        },
        {
            title: "Market Research Template",
            description: "Gather valuable market insights with ready-to-use templates",
            href: "#",
            image: PlaceHolderImages.find(img => img.id === "market-research-banner"),
            gradient: "from-emerald-50 to-green-100",
            textColor: "text-emerald-800",
            buttonColor: "bg-emerald-500 hover:bg-emerald-600 text-white"
        },
        {
            title: "Product Feedback Survey",
            description: "Collect actionable product feedback from your users",
            href: "#",
            image: PlaceHolderImages.find(img => img.id === "product-feedback-banner"),
            gradient: "from-pink-50 to-rose-100",
            textColor: "text-rose-800",
            buttonColor: "bg-rose-500 hover:bg-rose-600 text-white"
        },
    ];

    return (
        <Carousel
            plugins={React.useMemo(() => [autoplayPlugin.current], [])}
            className="w-full"
            opts={{ loop: true }}
        >
            <CarouselContent>
                {carouselItems.map((item, index) => (
                    <CarouselItem key={index}>
                        <div className={cn("p-8 md:p-12 rounded-xl flex items-center justify-between bg-gradient-to-r", item.gradient)}>
                            <div className="flex-1 space-y-4">
                                <h2 className={cn("text-3xl md:text-4xl font-bold", item.textColor)}>{item.title}</h2>
                                <p className={cn("text-base md:text-lg opacity-90", item.textColor)}>{item.description}</p>
                                <Link href={item.href}>
                                    <Button className={cn("mt-4 transition-transform hover:scale-105", item.buttonColor)}>Learn More</Button>
                                </Link>
                            </div>
                            {item.image && (
                                <Image
                                    src={item.image.imageUrl}
                                    alt={item.image.description}
                                    width={280}
                                    height={280}
                                    className="hidden md:block w-72 h-72 object-cover rounded-xl shadow-lg"
                                    data-ai-hint={item.image.imageHint}
                                />
                            )}
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
    )
}

// Enhanced Template Card with modern design
const TemplateCard = ({ 
    icon: Icon, 
    title, 
    description, 
    href, 
    learnMoreLink,
    badge,
    gradient = "from-blue-50 to-indigo-50"
}: { 
    icon: React.ElementType, 
    title: string, 
    description: string, 
    href: string, 
    learnMoreLink?: string,
    badge?: string,
    gradient?: string
}) => (
    <motion.div
        whileHover={{ y: -4, shadow: "lg" }}
        transition={{ duration: 0.2 }}
        className="relative group"
    >
        <Link href={href} className="block">
            <div className={cn(
                "relative p-6 rounded-xl border-2 border-transparent hover:border-primary/20 transition-all h-full flex flex-col bg-gradient-to-br overflow-hidden",
                gradient
            )}>
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                </div>
                
                {/* Badge */}
                {badge && (
                    <Badge className="absolute top-4 right-4 bg-primary/90 text-white">
                        {badge}
                    </Badge>
                )}
                
                {/* Icon with gradient background */}
                <div className="relative mb-4">
                    <div className="w-14 h-14 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                        <Icon className="w-7 h-7 text-primary" />
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 relative">
                    <h4 className="font-bold text-lg mb-2 text-slate-900 group-hover:text-primary transition-colors">
                        {title}
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        {description}
                    </p>
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200/50">
                    <span className="text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                        Use Template →
                    </span>
                    {learnMoreLink && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto p-0 text-xs hover:bg-transparent" 
                            asChild
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Link href={learnMoreLink}>Learn More</Link>
                        </Button>
                    )}
                </div>
            </div>
        </Link>
    </motion.div>
);

// Category section component
const CategorySection = ({ 
    title, 
    description, 
    icon: Icon,
    children 
}: { 
    title: string, 
    description: string,
    icon: React.ElementType,
    children: React.ReactNode 
}) => (
    <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
                <h3 className="font-bold text-xl text-slate-900">{title}</h3>
                <p className="text-sm text-slate-600">{description}</p>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children}
        </div>
    </div>
);

export default function Survey2Dashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedSurveys, setSelectedSurveys] = useState<string[]>([]);
  const [selectionModeActive, setSelectionModeActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSurveyUpdate = (updatedSurvey: Survey) => {
    setSurveys(prevSurveys => 
      prevSurveys.map(s => s.id === updatedSurvey.id ? updatedSurvey : s)
    );
  };

  const handleToggleSelection = (surveyId: string) => {
    setSelectedSurveys(prev =>
        prev.includes(surveyId)
            ? prev.filter(id => id !== surveyId)
            : [...prev, surveyId]
    );
  };

  const handleDeleteSelected = () => {
    const updatedSurveys = surveys.filter(s => !selectedSurveys.includes(s.id));
    
    const updatedResponses: SurveyResponse[] = [];
    updatedSurveys.forEach(survey => {
      const surveyResponses = JSON.parse(localStorage.getItem(`${survey.id}_responses`) || '[]');
      updatedResponses.push(...surveyResponses);
    });

    setSurveys(updatedSurveys);
    setResponses(updatedResponses); 
    localStorage.setItem('surveys', JSON.stringify(updatedSurveys));
    selectedSurveys.forEach(id => localStorage.removeItem(`${id}_responses`));
    
    toast({
        title: "Surveys Deleted",
        description: `${selectedSurveys.length} survey(s) and their responses have been deleted.`
    });
    setSelectedSurveys([]);
    setSelectionModeActive(false);
  };

  const handleToggleSelectionMode = () => {
    if (selectionModeActive) {
      setSelectedSurveys([]);
    }
    setSelectionModeActive(!selectionModeActive);
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
              <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-shadow">
                <Plus className="w-5 h-5" />
                Create New Survey
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] p-0">
              <DialogHeader className="px-8 pt-8 pb-4 border-b bg-gradient-to-r from-slate-50 to-blue-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl">Create a New Survey</DialogTitle>
                    <DialogDescription className="text-base">
                      Start from scratch or choose from our expert-designed templates
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <ScrollArea className="h-[calc(90vh-120px)]">
                <div className="px-8 py-6">
                  {/* Start from Scratch - Enhanced */}
                  <Link href="/dashboard/createsurvey">
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="relative p-8 mb-8 rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-white to-slate-50 hover:border-primary hover:shadow-lg transition-all cursor-pointer overflow-hidden group"
                    >
                      {/* Background decoration */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform"></div>
                      
                      <div className="relative flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                          <Plus className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-2xl mb-2 flex items-center gap-2">
                            Start from Scratch
                            <Zap className="w-5 h-5 text-yellow-500" />
                          </h3>
                          <p className="text-slate-600">
                            Build a completely custom survey tailored to your specific needs with full control over every aspect.
                          </p>
                        </div>
                        <div className="hidden lg:block">
                          <div className="px-6 py-3 rounded-full bg-primary text-white font-medium group-hover:bg-primary/90 transition-colors">
                            Get Started →
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>

                  {/* Search bar */}
                  <div className="mb-8">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 h-12 text-base rounded-xl border-2"
                      />
                    </div>
                  </div>

                  {/* Templates organized by category */}
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-5 mb-8 h-auto p-1 bg-slate-100 rounded-xl">
                      <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
                        All Templates
                      </TabsTrigger>
                      <TabsTrigger value="analysis" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
                        Analysis
                      </TabsTrigger>
                      <TabsTrigger value="pricing" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
                        Pricing
                      </TabsTrigger>
                      <TabsTrigger value="satisfaction" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
                        Satisfaction
                      </TabsTrigger>
                      <TabsTrigger value="other" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
                        Other
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-8">
                      {/* Conjoint Analysis */}
                      <CategorySection
                        title="Conjoint Analysis"
                        description="Understand customer preferences and product features"
                        icon={Handshake}
                      >
                        <TemplateCard 
                          icon={Handshake} 
                          title="Choice-Based Conjoint" 
                          description="Understand how customers value different attributes through realistic choice scenarios."
                          href="/dashboard/createsurvey?template=cbc"
                          gradient="from-blue-50 to-cyan-50"
                          badge="Popular"
                        />
                        <TemplateCard 
                          icon={ClipboardList} 
                          title="Rating Conjoint" 
                          description="Analyze customer preferences using rating scales for each product profile."
                          href="/dashboard/createsurvey?template=rating-conjoint"
                          gradient="from-purple-50 to-pink-50"
                        />
                        <TemplateCard 
                          icon={ArrowDownUp} 
                          title="Ranking Conjoint" 
                          description="Discover preferences by having users rank different product profiles."
                          href="/dashboard/createsurvey?template=ranking-conjoint"
                          gradient="from-indigo-50 to-blue-50"
                          badge="New"
                        />
                      </CategorySection>

                      {/* Performance Analysis */}
                      <CategorySection
                        title="Performance Analysis"
                        description="Evaluate importance and satisfaction metrics"
                        icon={Target}
                      >
                        <TemplateCard 
                          icon={Target} 
                          title="IPA Survey" 
                          description="Identify key improvement areas by measuring importance vs. performance."
                          href="/dashboard/createsurvey?template=ipa"
                          learnMoreLink="/dashboard/statistica?analysis=ipa"
                          gradient="from-emerald-50 to-teal-50"
                          badge="Featured"
                        />
                        <TemplateCard 
                          icon={Users} 
                          title="TURF Analysis" 
                          description="Optimize your product portfolio by identifying the best combination of offerings."
                          href="/dashboard/createsurvey?template=turf"
                          gradient="from-orange-50 to-amber-50"
                        />
                      </CategorySection>

                      {/* Pricing Research */}
                      <CategorySection
                        title="Pricing Research"
                        description="Determine optimal pricing strategies"
                        icon={DollarSign}
                      >
                        <TemplateCard 
                          icon={DollarSign} 
                          title="Price Sensitivity (PSM)" 
                          description="Use Van Westendorp analysis to find the optimal price range for your product."
                          href="/dashboard/createsurvey?template=van-westendorp"
                          gradient="from-green-50 to-emerald-50"
                          badge="Popular"
                        />
                        <TemplateCard 
                          icon={DollarSign} 
                          title="Gabor-Granger (Sequential)" 
                          description="Measure price elasticity using sequential purchase likelihood questions."
                          href="/dashboard/createsurvey?template=gabor-granger-1"
                          gradient="from-lime-50 to-green-50"
                        />
                        <TemplateCard 
                          icon={DollarSign} 
                          title="Gabor-Granger (Random)" 
                          description="Test price points in random order to eliminate order bias."
                          href="/dashboard/createsurvey?template=gabor-granger-2"
                          gradient="from-yellow-50 to-lime-50"
                        />
                      </CategorySection>

                      {/* Decision Making */}
                      <CategorySection
                        title="Decision Making"
                        description="Multi-criteria decision analysis tools"
                        icon={Network}
                      >
                        <TemplateCard 
                          icon={Network} 
                          title="AHP (Criteria Only)" 
                          description="Prioritize decision criteria using pairwise comparison methodology."
                          href="/dashboard/createsurvey?template=ahp-criteria"
                          gradient="from-violet-50 to-purple-50"
                        />
                        <TemplateCard 
                          icon={Network} 
                          title="AHP (Full)" 
                          description="Make complex decisions by comparing both criteria and alternatives systematically."
                          href="/dashboard/createsurvey?template=ahp-full"
                          gradient="from-fuchsia-50 to-pink-50"
                        />
                      </CategorySection>

                      {/* Customer Satisfaction */}
                      <CategorySection
                        title="Customer Satisfaction"
                        description="Measure and improve customer experience"
                        icon={ShieldCheck}
                      >
                        <TemplateCard 
                          icon={ClipboardList} 
                          title="Customer Satisfaction (CSAT)" 
                          description="Measure overall satisfaction and identify key drivers of customer happiness."
                          href="/dashboard/createsurvey?template=csat"
                          gradient="from-sky-50 to-blue-50"
                          badge="Recommended"
                        />
                        <TemplateCard 
                          icon={ShieldCheck} 
                          title="NPS Survey" 
                          description="Measure customer loyalty with the industry-standard Net Promoter Score."
                          href="/dashboard/createsurvey?template=nps"
                          gradient="from-cyan-50 to-teal-50"
                        />
                      </CategorySection>

                      {/* Brand & Perception */}
                      <CategorySection
                        title="Brand & Perception"
                        description="Understand brand positioning and perception"
                        icon={Star}
                      >
                        <TemplateCard 
                          icon={Replace} 
                          title="Semantic Differential" 
                          description="Gauge perception using bipolar adjective scales for nuanced insights."
                          href="/dashboard/createsurvey?template=semantic-differential"
                          gradient="from-rose-50 to-pink-50"
                        />
                        <TemplateCard 
                          icon={Activity} 
                          title="Brand Funnel" 
                          description="Track brand awareness, consideration, preference, and usage metrics."
                          href="/dashboard/createsurvey?template=brand-funnel"
                          gradient="from-red-50 to-orange-50"
                        />
                      </CategorySection>

                      {/* Service Quality */}
                      <CategorySection
                        title="Service Quality"
                        description="Evaluate and improve service delivery"
                        icon={Gauge}
                      >
                        <TemplateCard 
                          icon={Gauge} 
                          title="SERVQUAL" 
                          description="Compare customer expectations vs. perceptions across five quality dimensions."
                          href="/dashboard/createsurvey?template=servqual"
                          gradient="from-amber-50 to-orange-50"
                        />
                        <TemplateCard 
                          icon={TrendingUp} 
                          title="SERVPERF" 
                          description="Measure service quality based solely on performance perceptions."
                          href="/dashboard/createsurvey?template=servperf"
                          gradient="from-yellow-50 to-amber-50"
                        />
                      </CategorySection>
                    </TabsContent>

                    <TabsContent value="analysis">
                      <CategorySection
                        title="Conjoint & Performance Analysis"
                        description="Advanced analytical frameworks"
                        icon={BarChart3}
                      >
                        <TemplateCard 
                          icon={Handshake} 
                          title="Choice-Based Conjoint" 
                          description="Understand how customers value different attributes through realistic choice scenarios."
                          href="/dashboard/createsurvey?template=cbc"
                          gradient="from-blue-50 to-cyan-50"
                        />
                        <TemplateCard 
                          icon={ClipboardList} 
                          title="Rating Conjoint" 
                          description="Analyze customer preferences using rating scales for each product profile."
                          href="/dashboard/createsurvey?template=rating-conjoint"
                          gradient="from-purple-50 to-pink-50"
                        />
                        <TemplateCard 
                          icon={ArrowDownUp} 
                          title="Ranking Conjoint" 
                          description="Discover preferences by having users rank different product profiles."
                          href="/dashboard/createsurvey?template=ranking-conjoint"
                          gradient="from-indigo-50 to-blue-50"
                        />
                        <TemplateCard 
                          icon={Target} 
                          title="IPA Survey" 
                          description="Identify key improvement areas by measuring importance vs. performance."
                          href="/dashboard/createsurvey?template=ipa"
                          learnMoreLink="/dashboard/statistica?analysis=ipa"
                          gradient="from-emerald-50 to-teal-50"
                        />
                        <TemplateCard 
                          icon={Users} 
                          title="TURF Analysis" 
                          description="Optimize your product portfolio by identifying the best combination of offerings."
                          href="/dashboard/createsurvey?template=turf"
                          gradient="from-orange-50 to-amber-50"
                        />
                      </CategorySection>
                    </TabsContent>

                    <TabsContent value="pricing">
                      <CategorySection
                        title="Pricing Research Methods"
                        description="Find optimal pricing strategies"
                        icon={DollarSign}
                      >
                        <TemplateCard 
                          icon={DollarSign} 
                          title="Price Sensitivity (PSM)" 
                          description="Use Van Westendorp analysis to find the optimal price range for your product."
                          href="/dashboard/createsurvey?template=van-westendorp"
                          gradient="from-green-50 to-emerald-50"
                        />
                        <TemplateCard 
                          icon={DollarSign} 
                          title="Gabor-Granger (Sequential)" 
                          description="Measure price elasticity using sequential purchase likelihood questions."
                          href="/dashboard/createsurvey?template=gabor-granger-1"
                          gradient="from-lime-50 to-green-50"
                        />
                        <TemplateCard 
                          icon={DollarSign} 
                          title="Gabor-Granger (Random)" 
                          description="Test price points in random order to eliminate order bias."
                          href="/dashboard/createsurvey?template=gabor-granger-2"
                          gradient="from-yellow-50 to-lime-50"
                        />
                      </CategorySection>
                    </TabsContent>

                    <TabsContent value="satisfaction">
                      <CategorySection
                        title="Customer Satisfaction & Service Quality"
                        description="Measure and improve customer experience"
                        icon={ShieldCheck}
                      >
                        <TemplateCard 
                          icon={ClipboardList} 
                          title="Customer Satisfaction (CSAT)" 
                          description="Measure overall satisfaction and identify key drivers of customer happiness."
                          href="/dashboard/createsurvey?template=csat"
                          gradient="from-sky-50 to-blue-50"
                        />
                        <TemplateCard 
                          icon={ShieldCheck} 
                          title="NPS Survey" 
                          description="Measure customer loyalty with the industry-standard Net Promoter Score."
                          href="/dashboard/createsurvey?template=nps"
                          gradient="from-cyan-50 to-teal-50"
                        />
                        <TemplateCard 
                          icon={Gauge} 
                          title="SERVQUAL" 
                          description="Compare customer expectations vs. perceptions across five quality dimensions."
                          href="/dashboard/createsurvey?template=servqual"
                          gradient="from-amber-50 to-orange-50"
                        />
                        <TemplateCard 
                          icon={TrendingUp} 
                          title="SERVPERF" 
                          description="Measure service quality based solely on performance perceptions."
                          href="/dashboard/createsurvey?template=servperf"
                          gradient="from-yellow-50 to-amber-50"
                        />
                      </CategorySection>
                    </TabsContent>

                    <TabsContent value="other">
                      <CategorySection
                        title="Decision Making & Brand Analysis"
                        description="Specialized research methods"
                        icon={Network}
                      >
                        <TemplateCard 
                          icon={Network} 
                          title="AHP (Criteria Only)" 
                          description="Prioritize decision criteria using pairwise comparison methodology."
                          href="/dashboard/createsurvey?template=ahp-criteria"
                          gradient="from-violet-50 to-purple-50"
                        />
                        <TemplateCard 
                          icon={Network} 
                          title="AHP (Full)" 
                          description="Make complex decisions by comparing both criteria and alternatives systematically."
                          href="/dashboard/createsurvey?template=ahp-full"
                          gradient="from-fuchsia-50 to-pink-50"
                        />
                        <TemplateCard 
                          icon={Replace} 
                          title="Semantic Differential" 
                          description="Gauge perception using bipolar adjective scales for nuanced insights."
                          href="/dashboard/createsurvey?template=semantic-differential"
                          gradient="from-rose-50 to-pink-50"
                        />
                        <TemplateCard 
                          icon={Activity} 
                          title="Brand Funnel" 
                          description="Track brand awareness, consideration, preference, and usage metrics."
                          href="/dashboard/createsurvey?template=brand-funnel"
                          gradient="from-red-50 to-orange-50"
                        />
                      </CategorySection>
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
      
      <div className="mb-8">
        <TemplateCarousel />
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

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
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
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="icon"
                onClick={handleToggleSelectionMode}
                className={cn(selectionModeActive && "bg-primary text-primary-foreground")}
            >
                <CheckSquare className="w-5 h-5" />
            </Button>
            <AnimatePresence>
                {selectionModeActive && selectedSurveys.length > 0 && (
                    <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="gap-2">
                                    <Trash2 className="w-4 h-4" />
                                    Delete ({selectedSurveys.length})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete {selectedSurveys.length} survey(s) and all associated responses. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteSelected}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
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
                isSelected={selectedSurveys.includes(survey.id)}
                onToggleSelect={() => handleToggleSelection(survey.id)}
                selectionModeActive={selectionModeActive}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}


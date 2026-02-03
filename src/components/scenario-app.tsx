'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Loader2,
  TrendingUp,
  Backpack,
  Landmark,
  Megaphone,
  Factory,
  Users,
  ArrowLeftRight,
  Target,
  BarChart3,
  Route,
  Package,
  Zap,
  Layers,
  Activity,
  UserX,
  DollarSign,
  FlaskConical,
  Search,
  Check,
  TestTube,
  BookOpen,
  LineChart,
  PieChart,
  Gauge,
  Settings,
  GitBranch,
  Boxes,
  ShoppingCart,
  Workflow,
  MousePointerClick,
  Scale,
  Filter,
  Wallet,
  CircleDollarSign,
  TrendingDown,
  MapPin,
  Percent,
  Calculator,
  Calendar,
  GraduationCap,
  Heart,
  UserCheck,
  ClipboardList,
  AlertTriangle,
  ShieldAlert,
  CreditCard,
  Radar,
  Grid3X3,
  Clock,
  BarChart2,
  Truck,
  Users2,
  Building2,
  FileBarChart,
  Timer,
  Baby,
  Briefcase,
  Store,
  Car,
  TrainFront,
  ParkingCircle,
  Cloud,
  Flame,
  Shield,
  Map,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  type DataSet,  parseData, unparseData} from '@/lib/stats';

import { useToast } from '@/hooks/use-toast';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';

// Import scenario pages
import ScenarioGuidePage from './pages/scenario/guide-page';
import PrePostPolicyPage from './pages/scenario/pre-post-policy-page';
import PolicyTargetImpactPage from './pages/scenario/policy-target-impact-page';
import PolicyDistributionPage from './pages/scenario/policy-distribution-page';
import CampaignPerformancePage from './pages/scenario/campaign-performance-page';
import ChannelEfficiencyPage from './pages/scenario/channel-efficiency-page';
import FeatureAdoptionPage from './pages/scenario/feature-adoption-page';
import EngagementChangePage from './pages/scenario/engagement-change-page';
import ChurnDiagnosisPage from './pages/scenario/churn-diagnosis-page';
import HrPolicyOutcomePage from './pages/scenario/hr-policy-outcome-page';
import LtvPage from './pages/scenario/ltv-prediction-page';
import MarketBasketAnalysisPage from './pages/scenario/market_basket_analysis';
import DemandElasticityPage from './pages/scenario/demand_elasticity_page';
import LeadScoringPage from './pages/scenario/lead-scoring-page';
import AhaMomentPage from './pages/scenario/aha_moment_page';
import NextBestActionPage from './pages/scenario/next_best_action_page';

// Import NEW analysis pages (15)
import SPCPage from './pages/scenario/SPCPage';
import GageRRPage from './pages/scenario/GageRRPage';
import YieldAnalysisPage from './pages/scenario/YieldAnalysisPage';
import OEEPage from './pages/scenario/OEEPage';
import ProcessCapabilityPage from './pages/scenario/ProcessCapabilityPage';
import PortfolioOptimizationPage from './pages/scenario/PortfolioOptimizationPage';
import CohortAnalysisPage from './pages/scenario/CohortAnalysisPage';
import CustomerSegmentationPage from './pages/scenario/CustomerSegmentationPage';
import SalesForecastPage from './pages/scenario/SalesForecastPage';
import MMMPage from './pages/scenario/MMMPage';
import PromotionOptimizationPage from './pages/scenario/PromotionOptimizationPage';
import ConversionRatePage from './pages/scenario/ConversionRatePage';
import BreakevenAnalysisPage from './pages/scenario/BreakevenAnalysisPage';
import InventoryOptimizationPage from './pages/scenario/InventoryOptimizationPage';

// Import HR Analytics pages
import AttritionPredictionPage from './pages/scenario/AttritionPredictionPage';
import CompensationAnalysisPage from './pages/scenario/CompensationAnalysisPage';
import FunnelAnalysisPage from "./pages/scenario/funnel_analysis";
import EngagementSurveyPage from './pages/scenario/EngagementSurveyPage';
import DiversityInclusionPage from './pages/scenario/DiversityInclusionPage';
import AbsenteeismAnalysisPage from './pages/scenario/AbsenteeismAnalysisPage';
import CreditRiskPage from './pages/scenario/CreditRiskPage';
import AnomalyDetectionPage from './pages/scenario/AnomalyDetectionPage';
import VaRPage from './pages/scenario/VaRPage';

import KPIPage from './pages/scenario/KPIPage';
import ProcessingPage from './pages/scenario/process-mining-page';
import VRPAnalysisPage from './pages/scenario/vrp_analysis';
import SchedulingAnalysisPage from './pages/scenario/scheduling_analysis';
import BinPackingPage from './pages/scenario/bin_packing';
import KnapsackPage from './pages/scenario/knapsack';
import TSPPage from './pages/scenario/tsp';
import AssignmentPage from './pages/scenario/assignment';
import DEAPage from './pages/scenario/DEAPage';

// Import Public Sector Analysis pages
import WelfarePolicyImpactPage from './pages/scenario/WelfarePolicyImpactPage';
import BudgetExecutionPage from './pages/scenario/BudgetExecutionPage';
import ComplaintProcessingPage from './pages/scenario/ComplaintProcessingPage';
import PublicServiceTrendPage from './pages/scenario/PublicServiceTrendPage';
import AgingAnalysisPage from './pages/scenario/AgingAnalysisPage';
import BirthDeathTrendPage from './pages/scenario/BirthDeathTrendPage';
import PopulationMigrationPage from './pages/scenario/PopulationMigrationPage';
import YouthUnemploymentPage from './pages/scenario/YouthUnemploymentPage';
import RegionalIncomePage from './pages/scenario/RegionalIncomePage';
import SmallBusinessSalesPage from './pages/scenario/SmallBusinessSalesPage';
import EmploymentIndustryPage from './pages/scenario/EmploymentIndustryPage';
import TrafficVolumeAnalysisPage from './pages/scenario/TrafficVolumeAnalysisPage';
import TransitCongestionPage from './pages/scenario/TransitCongestionPage';
import AccidentHotspotPage from './pages/scenario/AccidentHotspotPage';
import ParkingDemandPage from './pages/scenario/ParkingDemandPage';
import AirQualityAnalysisPage from './pages/scenario/AirQualityAnalysisPage';
import WeatherAccidentCorrelationPage from './pages/scenario/WeatherAccidentCorrelationPage';
import DisasterPatternPage from './pages/scenario/DisasterPatternPage';
import CrimeHotspotPage from './pages/scenario/CrimeHotspotPage';

const analysisCategories = [
      {
          name: 'Overview',
          icon: BookOpen,
          isSingle: true,
          items: [
            { id: 'guide', label: 'Overview', icon: BookOpen, component: ScenarioGuidePage },
          ]
      },
      {
          name: 'Marketing & Sales',
          icon: Megaphone,
          items: [
              { id: 'ltv-prediction', label: 'Customer Lifetime Value Forecasting', component: LtvPage, icon: DollarSign },
              { id: 'mmm', label: 'Marketing Mix Modeling', component: MMMPage, icon: BarChart3 },
              { id: 'demand-elasticity', label: 'Pricing Optimization', component: DemandElasticityPage, icon: Percent },
              { id: 'promotion-optimization', label: 'Promotion Optimization', component: PromotionOptimizationPage, icon: Percent },
              { id: 'next-best-action', label: 'Next Best Action', component: NextBestActionPage,icon: ShoppingCart },
              { id: 'lead-scoring', label: 'Lead Scoring', component: LeadScoringPage, icon: UserCheck },
              { id: 'sales-forecast', label: 'Sales Forecast', component: SalesForecastPage, icon: TrendingUp },
            ],
      },
      {
        name: 'Customer & Engagement',
        icon: Package,
        items: [
          { id: 'customer-segmentation', label: 'Customer Segmentation', icon: PieChart, component: CustomerSegmentationPage },
          { id: 'churn-diagnosis', label: 'Churn & Drop-off Diagnosis', component: ChurnDiagnosisPage, icon: UserX },
          { id: 'aha-moment', label: 'Aha-Moment', component: AhaMomentPage, icon: Zap},
          { id: 'cohort-analysis', label: 'Cohort Analysis', component: CohortAnalysisPage, icon: Users },
            { id: 'funnel-analysis', label: 'Funnel Analysis', component: FunnelAnalysisPage, icon: Filter },
            { id: 'conversion-rate', label: 'Conversion Rate Analysis', component: ConversionRatePage, icon: MousePointerClick },
            { id: 'association-rule', label: 'Market Basket Analysis', component: MarketBasketAnalysisPage, icon: GitBranch },
            { id: 'feature-adoption', label: 'Feature Adoption Analysis', component: FeatureAdoptionPage, icon: Layers },
            { id: 'engagement-change', label: 'User Engagement Change Analysis', component: EngagementChangePage, icon: Activity },
          ],
    },
      {
          name: 'Operations & Logistics',
          icon: Factory,
          items: [
              { id: 'process-mining', label: 'Process Mining', component: ProcessingPage, icon: Workflow },
              { id: 'vrp-analysis', label: 'Vehicle Routing (VRP)', component: VRPAnalysisPage, icon: Route },
              { id: 'tsp', label: 'Traveling Salesman (TSP)', component: TSPPage, icon: MapPin },
              { id: 'inventory-optimization', label: 'Inventory Optimization', component: InventoryOptimizationPage, icon: Boxes },
              { id: 'scheduling-analysis', label: 'Job Shop Scheduling', component: SchedulingAnalysisPage, icon: Calendar },
              { id: 'bin-packing', label: 'Bin Packing', component: BinPackingPage, icon: Package },
              { id: 'assignment', label: 'Assignment Problem', component: AssignmentPage, icon: UserCheck },
              { id: 'knapsack', label: 'Knapsack Problem', component: KnapsackPage, icon: Backpack },
            ],
      },
      {
          name: 'Finance & Risk',
          icon: Wallet,
          items: [
              { id: 'portfolio-optimization', label: 'Portfolio Optimization', component: PortfolioOptimizationPage, icon: PieChart },
              { id: 'var-analysis', label: 'Value at Risk (VaR)', component: VaRPage, icon: TrendingDown },
              { id: 'credit-risk', label: 'Credit Risk Scoring', component: CreditRiskPage, icon: CreditCard },
              { id: 'anomaly-detection', label: 'Anomaly Detection', component: AnomalyDetectionPage, icon: Radar },
              { id: 'breakeven-analysis', label: 'Break-even Analysis', component: BreakevenAnalysisPage, icon: Scale },
          ],
      },
      {
          name: 'Quality & Manufacturing',
          icon: Gauge,
          items: [
              { id: 'spc', label: 'SPC Control Charts', component: SPCPage, icon: LineChart },
              { id: 'gage-rr', label: 'MSA / Gage R&R', component: GageRRPage, icon: Settings },
              { id: 'yield-analysis', label: 'Yield & Defect Analysis', component: YieldAnalysisPage, icon: Target },
              { id: 'oee', label: 'OEE Analysis', component: OEEPage, icon: Gauge },
              { id: 'process-capability', label: 'Process Capability (Cp/Cpk)', component: ProcessCapabilityPage, icon: BarChart3 },
          ],
      },
      {
          name: 'HR & Organization',
          icon: Users,
          items: [
              { id: 'attrition-prediction', label: 'Attrition Modeling', component: AttritionPredictionPage, icon: TrendingDown },
              { id: 'compensation-analysis', label: 'Compensation Analysis', component: CompensationAnalysisPage, icon: DollarSign },
              { id: 'engagement-survey', label: 'Employee Engagement Survey', component: EngagementSurveyPage, icon: ClipboardList },
              { id: 'diversity-inclusion', label: 'Diversity & Inclusion Analysis', component: DiversityInclusionPage, icon: Heart },
              { id: 'absenteeism-analysis', label: 'Absenteeism Analysis', component: AbsenteeismAnalysisPage, icon: Calendar },
          ],
      },
  ];

const analysisPages: Record<string, React.ComponentType<any>> = {};
analysisCategories.forEach(category => {
  category.items.forEach(item => {
    analysisPages[item.id] = item.component;
  });
});

export default function ScenarioApp() {
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
  const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<string>('guide');
  const [openCategories, setOpenCategories] = useState<string[]>(['Overview', 'Policy / Institution']);
  const [searchTerm, setSearchTerm] = useState('');

  const { toast } = useToast();

  const handleClearData = useCallback(() => {
    setData([]);
    setAllHeaders([]);
    setNumericHeaders([]);
    setCategoricalHeaders([]);
    setFileName('');
  }, []);

  const processData = useCallback((content: string, name: string) => {
    setIsUploading(true);
    try {
        const { headers: newHeaders, data: newData, numericHeaders: newNumericHeaders, categoricalHeaders: newCategoricalHeaders } = parseData(content);
        if (newData.length === 0 || newHeaders.length === 0) {
          throw new Error("No valid data found in the file.");
        }
        setData(newData);
        setAllHeaders(newHeaders);
        setNumericHeaders(newNumericHeaders);
        setCategoricalHeaders(newCategoricalHeaders);
        setFileName(name);
        toast({ title: 'Success', description: `Loaded "${name}" and found ${newData.length} rows.`});
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'File Processing Error', description: error.message });
        handleClearData();
      } finally {
        setIsUploading(false);
      }
  }, [toast, handleClearData]);

  const handleDownloadData = useCallback(() => {
    if (data.length === 0) {
      toast({ title: 'No Data to Download', description: 'There is no data currently loaded.' });
      return;
    }
    try {
      const csvContent = unparseData({ headers: allHeaders, data });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/\.[^/.]+$/, "") + "_scenario.csv" || 'scenario_data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download data:', error);
      toast({ variant: 'destructive', title: 'Download Error', description: 'Could not prepare data for download.' });
    }
  }, [data, allHeaders, fileName, toast]);

  const handleFileSelected = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target?.result as string;
        processData(content, file.name);
    };
    reader.onerror = () => {
        toast({ variant: 'destructive', title: 'File Read Error', description: 'An error occurred while reading the file.' });
    };
    if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        reader.readAsArrayBuffer(file);
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            processData(csv, file.name);
        }
    } else {
        reader.readAsText(file);
    }
  }, [processData, toast]);

  const handleLoadExampleData = (example: ExampleDataSet) => {
    processData(example.data, example.name);
    if(example.recommendedAnalysis) {
      setActiveAnalysis(example.recommendedAnalysis);
    }
  };

  const filteredAnalysisCategories = useMemo(() => {
    if (!searchTerm) {
      return analysisCategories;
    }
    const lowercasedFilter = searchTerm.toLowerCase();

    return analysisCategories.map(category => {
      const filteredItems = category.items.filter(item => item.label.toLowerCase().includes(lowercasedFilter));
      return filteredItems.length > 0 ? { ...category, items: filteredItems } : null;
    }).filter(Boolean) as typeof analysisCategories;
  }, [searchTerm]);

  const ActivePageComponent = analysisPages[activeAnalysis] || ScenarioGuidePage;
  const hasData = data.length > 0;

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className='p-2'>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search scenarios..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-2 p-2">
            <SidebarMenu>
              {filteredAnalysisCategories.map(category =>
                category.isSingle ? (
                  <SidebarMenuItem key={category.name}>
                    <SidebarMenuButton
                      onClick={() => setActiveAnalysis(category.items[0].id)}
                      isActive={activeAnalysis === category.items[0].id}
                      className="text-base font-semibold"
                    >
                      <category.icon className="mr-2 h-5 w-5" />
                      {category.name}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : (
                  <Collapsible key={category.name} open={openCategories.includes(category.name)} onOpenChange={() => toggleCategory(category.name)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start text-base px-2 font-semibold shadow-md border bg-white text-foreground hover:bg-slate-50">
                        <category.icon className="mr-2 h-5 w-5" />
                        <span>{category.name}</span>
                        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes(category.name) && 'rotate-180')} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                       <SidebarMenu>
                          {category.items.map(item => (
                            <SidebarMenuItem key={item.id}>
                              <SidebarMenuButton
                                onClick={() => setActiveAnalysis(item.id)}
                                isActive={activeAnalysis === item.id}
                              >
                                {item.icon && <item.icon className="h-4 w-4"/>}
                                {item.label}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                    </CollapsibleContent>
                  </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger />
                <div />
            </header>
            
            {hasData && (
              <DataPreview 
                fileName={fileName}
                data={data}
                headers={allHeaders}
                onDownload={handleDownloadData} 
                onClearData={handleClearData}
              />
            )}
            
            <ActivePageComponent 
                data={data}
                allHeaders={allHeaders}
                numericHeaders={numericHeaders}
                categoricalHeaders={categoricalHeaders}
                onLoadExample={handleLoadExampleData}
              />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

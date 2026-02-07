'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
  SidebarGroupLabel,
  SidebarFooter
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
    TrendingUp,
    BarChart,
    Users,
    Wand2,
    Repeat,
    Component,
    BookOpen,
    Search,
    Activity,
    Landmark,
    Download,
    DollarSign,
    Calculator,
    PieChart,
    ShieldCheck,
    Coins,
    ArrowUpRight,
    LayoutDashboard,
    Clock,
    FileText,
    Target,
    Settings2,
    Layers,
    Table2,
    Briefcase,
    Timer,
    Zap,
    Scale,
    AlertCircle,
    LineChart,
    Boxes,
    GitBranch,
    ChevronDown
} from 'lucide-react';

import * as XLSX from 'xlsx';
import { parseData, unparseData, type DataSet } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';

import { getSummaryReport } from '@/app/actions';
import AIInteractionController from './AIInteractionController';

// Pages
import FinanceGuidePage from '@/components/pages/finance/guide-page';
import PortfolioOptimizationPage from '@/components/pages/finance/portfolio-optimization-page';

// Forecasting
import RevenueForecastPage from '@/components/pages/finance/revenue-forecast-page';
import CostForecastPage from '@/components/pages/finance/cost-forecast-page';
import CashFlowForecastPage from '@/components/pages/finance/cash-flow-forecast-page';

// Valuation
import DCFModelPage from '@/components/pages/finance/dcf-model-page';
import CCAPage from '@/components/pages/finance/cca-page';
import PrecedentTransactionsPage from '@/components/pages/finance/precedent-transactions-page';
import StartupValuationPage from '@/components/pages/finance/startup-valuation-page';

// Budgeting
import AnnualBudgetPlanningPage from '@/components/pages/finance/annual-budget-planning-page';
import RollingForecastPage from '@/components/pages/finance/rolling-forecast-page';
import DepartmentBudgetAllocationPage from '@/components/pages/finance/department-budget-allocation-page';
import VarianceAnalysisPage from '@/components/pages/finance/variance-analysis-page';

// Profitability
import ProductProfitabilityPage from '@/components/pages/finance/product-profitability-page';
import CustomerProfitabilityPage from '@/components/pages/finance/customer-profitability-page';
import UnitEconomicsPage from '@/components/pages/finance/unit-economics-page';
import ContributionMarginAnalysisPage from '@/components/pages/finance/contribution-margin-analysis-page';

// Scenario
import SensitivityAnalysisPage from '@/components/pages/finance/sensitivity-analysis-page';
import WhatIfSimulationPage from '@/components/pages/finance/what-if-simulation-page';
import MonteCarloSimulationPage from '@/components/pages/finance/monte-carlo-simulation-page';
import StressTestingPage from '@/components/pages/finance/stress-testing-page';

// Capital
import CapexPlanningPage from '@/components/pages/finance/capex-planning-page';
import RoiAnalysisPage from '@/components/pages/finance/roi-analysis-page';
import IrrNpvCalculatorPage from '@/components/pages/finance/irr-npv-calculator-page';
import PaybackPeriodAnalysisPage from '@/components/pages/finance/payback-period-analysis-page';

// Risk
import FinancialRiskAssessmentPage from '@/components/pages/finance/financial-risk-assessment-page';
import LiquidityRiskPage from '@/components/pages/finance/liquidity-risk-page';
import CreditRiskModelingPage from '@/components/pages/finance/credit-risk-modeling-page';
import MarketRiskSimulationPage from '@/components/pages/finance/market-risk-simulation-page';

// Financial Statements
import ThreeStatementModelPage from '@/components/pages/finance/three-statement-model-page';
import WorkingCapitalModelPage from '@/components/pages/finance/working-capital-model-page';
import DebtScheduleModelingPage from '@/components/pages/finance/debt-schedule-modeling-page';


export interface AnalysisPageProps {
  data: DataSet;
  allHeaders: string[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: ExampleDataSet) => void;
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  activeAnalysis: string;
  onAnalysisComplete?: (result: any) => void;
  restoredState?: any;
  fileName?: string;
  onClearData?: () => void;
  onGenerateReport?: (analysisType: string, stats: any, viz: string | null) => void;
}


interface FinanceItem {
    id: string;
    label: string;
    icon: React.ElementType;
    component: React.ComponentType<AnalysisPageProps>;
}

interface FinanceSubCategory {
    name: string;
    items: FinanceItem[];
}

interface BaseFinanceCategory {
    name: string;
    icon: React.ElementType;
}

interface SingleLevelFinanceCategory extends BaseFinanceCategory {
    isSingle?: true;
    items: FinanceItem[];
    subCategories?: undefined;
}

interface MultiLevelFinanceCategory extends BaseFinanceCategory {
    isSingle?: false;
    items?: undefined;
    subCategories: FinanceSubCategory[];
}

type FinanceCategory = SingleLevelFinanceCategory | MultiLevelFinanceCategory;


function RocketIcon({ className = "w-4 h-4", ...props }: any) {
    return (
        <svg {...props} className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3" />
            <path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5" />
        </svg>
    );
}

function CalendarDaysIcon({ className = "w-4 h-4", ...props }: any) {
    return (
        <svg {...props} className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
            <path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" />
            <path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" />
        </svg>
    )
}

function SlidersHorizontalIcon({ className = "w-4 h-4", ...props }: any) {
    return (
        <svg {...props} className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" />
            <line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" />
            <line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" />
            <line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" />
        </svg>
    )
}


const financeCategories: FinanceCategory[] = [
  {
    name: 'Overview', icon: BookOpen, isSingle: true,
    items: [{ id: 'guide', label: 'Overview', icon: LayoutDashboard, component: FinanceGuidePage as any }]
  },
  {
    name: 'Forecasting', icon: TrendingUp,
    subCategories: [{
      name: 'Sales & Operations',
      items: [
        { id: 'revenue-forecast', label: 'Revenue Forecast', icon: BarChart, component: RevenueForecastPage as any },
        { id: 'cost-forecast', label: 'Cost Forecast', icon: Activity, component: CostForecastPage as any },
        { id: 'cash-flow-forecast', label: 'Cash Flow Forecast', icon: Coins, component: CashFlowForecastPage as any },
      ]
    }]
  },
  {
    name: 'Valuation', icon: Landmark,
    subCategories: [{
      name: 'Methodologies',
      items: [
        { id: 'dcf-model', label: 'DCF Model', icon: Calculator, component: DCFModelPage as any },
        { id: 'cca', label: 'Comparable Company Analysis', icon: Users, component: CCAPage as any },
        { id: 'precedent-transactions', label: 'Precedent Transactions', icon: Repeat, component: PrecedentTransactionsPage as any },
        { id: 'startup-valuation', label: 'Startup Valuation', icon: RocketIcon, component: StartupValuationPage as any },
      ]
    }]
  },
  {
    name: 'Budgeting & Planning', icon: CalendarDaysIcon,
    subCategories: [{
      name: 'Strategic Planning',
      items: [
        { id: 'annual-budget-planning', label: 'Annual Budget Planning', icon: FileText, component: AnnualBudgetPlanningPage as any },
        { id: 'rolling-forecast', label: 'Rolling Forecast', icon: Clock, component: RollingForecastPage as any },
        { id: 'department-budget-allocation', label: 'Department Budget Allocation', icon: Layers, component: DepartmentBudgetAllocationPage as any },
        { id: 'variance-analysis', label: 'Variance Analysis', icon: Scale, component: VarianceAnalysisPage as any },
      ]
    }]
  },
  {
    name: 'Profitability Analysis', icon: PieChart,
    subCategories: [{
      name: 'Performance Metrics',
      items: [
        { id: 'product-profitability', label: 'Product Profitability', icon: Boxes, component: ProductProfitabilityPage as any },
        { id: 'customer-profitability', label: 'Customer Profitability', icon: Users, component: CustomerProfitabilityPage as any },
        { id: 'unit-economics', label: 'Unit Economics', icon: Target, component: UnitEconomicsPage as any },
        { id: 'contribution-margin-analysis', label: 'Contribution Margin Analysis', icon: BarChart, component: ContributionMarginAnalysisPage as any },
      ]
    }]
  },
  {
    name: 'Scenario & Sensitivity', icon: SlidersHorizontalIcon,
    subCategories: [{
      name: 'What-if Analysis',
      items: [
        { id: 'sensitivity-analysis', label: 'Sensitivity Analysis', icon: Activity, component: SensitivityAnalysisPage as any },
        { id: 'what-if-simulation', label: 'What-if Simulation', icon: Zap, component: WhatIfSimulationPage as any },
        { id: 'monte-carlo-simulation', label: 'Monte Carlo Simulation', icon: Wand2, component: MonteCarloSimulationPage as any },
        { id: 'stress-testing', label: 'Stress Testing', icon: ShieldCheck, component: StressTestingPage as any },
      ]
    }]
  },
  {
    name: 'Capital & Investment', icon: Briefcase,
    subCategories: [{
      name: 'Investment Appraisal',
      items: [
        { id: 'portfolio-optimization', label: 'Portfolio Optimization', icon: Scale, component: PortfolioOptimizationPage as any },
        { id: 'capex-planning', label: 'CAPEX Planning', icon: Settings2, component: CapexPlanningPage as any },
        { id: 'roi-analysis', label: 'ROI Analysis', icon: TrendingUp, component: RoiAnalysisPage as any },
        { id: 'irr-npv-calculator', label: 'IRR / NPV Calculator', icon: Calculator, component: IrrNpvCalculatorPage as any },
        { id: 'payback-period-analysis', label: 'Payback Period Analysis', icon: Timer, component: PaybackPeriodAnalysisPage as any },
      ]
    }]
  },
  {
    name: 'Risk Modeling', icon: ShieldCheck,
    subCategories: [{
      name: 'Exposure Analysis',
      items: [
        { id: 'financial-risk-assessment', label: 'Financial Risk Assessment', icon: AlertCircle, component: FinancialRiskAssessmentPage as any },
        { id: 'liquidity-risk', label: 'Liquidity Risk', icon: Coins, component: LiquidityRiskPage as any },
        { id: 'credit-risk-modeling', label: 'Credit Risk Modeling', icon: Landmark, component: CreditRiskModelingPage as any },
        { id: 'market-risk-simulation', label: 'Market Risk Simulation', icon: Activity, component: MarketRiskSimulationPage as any },
      ]
    }]
  },
  {
    name: 'Financial Statements', icon: Table2,
    subCategories: [{
      name: 'Accounting Models',
      items: [
        { id: 'three-statement-model', label: '3-Statement Model', icon: Table2, component: ThreeStatementModelPage as any },
        { id: 'working-capital-model', label: 'Working Capital Model', icon: Repeat, component: WorkingCapitalModelPage as any },
        { id: 'debt-schedule-modeling', label: 'Debt Schedule Modeling', icon: FileText, component: DebtScheduleModelingPage as any },
      ]
    }]
  }
];

const analysisPages: Record<string, React.ComponentType<any>> = financeCategories
  .flatMap(category => category.isSingle ? category.items : (category.subCategories || []).flatMap((sc: FinanceSubCategory) => sc.items))
  .reduce((acc, item) => {
    if (item) { acc[item.id] = item.component; }
    return acc;
  }, {} as Record<string, React.ComponentType<any>>);


export default function FinancialModelingApp() {
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
  const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [report, setReport] = useState<{ title: string, content: string } | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState('guide');
  const [openCategories, setOpenCategories] = useState<string[]>(['Forecasting']);
  const [searchTerm, setSearchTerm] = useState('');
  const [analysisResultForChat, setAnalysisResultForChat] = useState<any>(null);

  const { toast } = useToast();

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  };

  const handleClearData = useCallback(() => {
    setData([]);
    setAllHeaders([]);
    setNumericHeaders([]);
    setCategoricalHeaders([]);
    setFileName('');
    setActiveAnalysis('guide');
    setAnalysisResultForChat(null);
  }, []);

  const processData = useCallback((content: string, name: string) => {
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
      toast({ title: 'Success', description: `Loaded "${name}" and found ${newData.length} rows.` });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'File Processing Error',
        description: error.message || 'Could not parse file. Please check the format.',
      });
      handleClearData();
    } finally {
      setIsUploading(false);
    }
  }, [toast, handleClearData]);

  const handleFileSelected = useCallback((file: File) => {
    setIsUploading(true);
    const reader = new FileReader();

    reader.onerror = () => {
      toast({ variant: 'destructive', title: 'File Read Error', description: 'An error occurred while reading the file.' });
      setIsUploading(false);
    };

    if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          const workbook = XLSX.read(uint8Array, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          processData(csv, file.name);
        } catch (error) {
          toast({ variant: 'destructive', title: 'Excel Parse Error', description: 'Could not parse Excel file.' });
          setIsUploading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) {
          toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read file content.' });
          setIsUploading(false);
          return;
        }
        processData(content, file.name);
      };
      reader.readAsText(file);
    }
  }, [processData, toast]);

  const handleLoadExampleData = useCallback((example: ExampleDataSet) => {
    setIsUploading(true);
    processData(example.data, example.name);
    if (example.recommendedAnalysis) {
      setActiveAnalysis(example.recommendedAnalysis);
    }
  }, [processData]);

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
      a.download = fileName.replace(/\.[^/.]+$/, "") + "_finance.csv" || 'finance_data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download data:', error);
      toast({ variant: 'destructive', title: 'Download Error', description: 'Could not prepare data for download.' });
    }
  }, [data, allHeaders, fileName, toast]);

  const handleGenerateReport = useCallback(async (analysisType: string, stats: any, viz: string | null) => {
    setIsGeneratingReport(true);
    try {
      const result = await getSummaryReport({
        analysisType,
        statistics: JSON.stringify(stats, null, 2),
        visualizations: viz || "No visualization available.",
      });
      if (result.success && result.report) {
        setReport({ title: 'Analysis Report', content: result.report });
      } else {
        toast({ variant: 'destructive', title: 'Failed to generate report', description: result.error });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'An error occurred while generating the report.' });
    } finally {
      setIsGeneratingReport(false);
    }
  }, [toast]);

  const downloadReport = useCallback(() => {
    if (!report) return;
    const blob = new Blob([report.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finance_report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [report]);

  const hasData = data.length > 0;

  const filteredCategories: FinanceCategory[] = useMemo(() => {
    if (!searchTerm) return financeCategories;
    const lowercasedFilter = searchTerm.toLowerCase();

    return financeCategories.map(category => {
        if (category.isSingle) {
            const hasMatch = category.items[0].label.toLowerCase().includes(lowercasedFilter);
            return hasMatch ? category : null;
        }

        if (category.subCategories) {
            const filteredSubCategories = category.subCategories
                .map((sub: FinanceSubCategory) => {
                    const filteredItems = sub.items.filter(item => item.label.toLowerCase().includes(lowercasedFilter));
                    return filteredItems.length > 0 ? { ...sub, items: filteredItems } : null;
                })
                .filter(Boolean) as FinanceSubCategory[];

            return filteredSubCategories.length > 0 ? { ...category, subCategories: filteredSubCategories } : null;
        }

        return null;
    }).filter(Boolean) as FinanceCategory[];
  }, [searchTerm]);

  const ActivePageComponent = useMemo(() => {
    for (const category of financeCategories) {
        if (category.isSingle) {
            const found = category.items.find(item => item.id === activeAnalysis);
            if (found) return found.component;
        } else if (category.subCategories) {
            for (const sub of category.subCategories) {
                const found = sub.items.find((item: any) => item.id === activeAnalysis);
                if(found) return found.component;
            }
        }
    }
    return FinanceGuidePage;
  }, [activeAnalysis]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="offcanvas">
          <SidebarHeader>
            <div className='p-2 space-y-2'>
              <DataUploader 
                onFileSelected={handleFileSelected}
                loading={isUploading}
              />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search models..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {filteredCategories.map(category => {
                if (category.isSingle) {
                  const item = category.items[0];
                  const IconComp = item.icon;
                  return (
                    <SidebarMenuItem key={category.name}>
                      <SidebarMenuButton
                        onClick={() => setActiveAnalysis(item.id)}
                        isActive={activeAnalysis === item.id}
                      >
                        <div className="flex items-center gap-2">
                          {IconComp && <IconComp className="h-4 w-4" />}
                          <span className="truncate">{item.label}</span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                const CatIcon = category.icon;
                return (
                  <Collapsible key={category.name} open={openCategories.includes(category.name)} onOpenChange={() => toggleCategory(category.name)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start text-base px-2 font-semibold shadow-md border bg-white text-foreground hover:bg-slate-50">
                        <CatIcon className="mr-2 h-5 w-5" />
                        <span>{category.name}</span>
                        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes(category.name) && 'rotate-180')} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenu>
                        {category.subCategories?.map((sub: FinanceSubCategory, i: number) => (
                          <div key={i}>
                            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-2 my-1">{sub.name}</SidebarGroupLabel>
                            {sub.items.map((item: FinanceItem) => {
                              const ItemIcon = item.icon;
                              return (
                              <SidebarMenuItem key={item.id}>
                                <SidebarMenuButton
                                  onClick={() => setActiveAnalysis(item.id)}
                                  isActive={activeAnalysis === item.id}
                                  className="w-full"
                                >
                                  <div className="flex items-center gap-2">
                                    {ItemIcon && <ItemIcon className="h-4 w-4" />}
                                    <span className="truncate">{item.label}</span>
                                  </div>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                              );
                            })}
                          </div>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            {/* UserNav is now in the page header */}
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger />
                <div />
            </header>

            {hasData && activeAnalysis !== 'guide' && (
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
                onFileSelected={handleFileSelected}
                isUploading={isUploading}
                activeAnalysis={activeAnalysis}
                onAnalysisComplete={setAnalysisResultForChat}
                onGenerateReport={handleGenerateReport}
                fileName={fileName}
                onClearData={handleClearData}
              />
          </div>
        </SidebarInset>
      </div>

       <AIInteractionController 
        activeAnalysis={activeAnalysis}
        analysisResultForChat={analysisResultForChat}
      />

    </SidebarProvider>
  );
}


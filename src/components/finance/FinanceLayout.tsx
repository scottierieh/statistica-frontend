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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { financeExampleDatasets, type ExampleDataset } from '@/lib/finance-example-datasets';
import DataUploader from '@/components/data-uploader';
import DataPreview from '@/components/data-preview';
import type { DataSet } from '@/lib/stats';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, Landmark, Wallet, LayoutDashboard, PieChart, LineChart, CandlestickChart, History, GitCompare, Shield, TrendingDown, Zap, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

// Page Components
import PortfolioOverviewPage from './pages/finance/portfolio-overview-page';
import AssetAllocationPage from './pages/finance/asset-allocation-page';
import PerformanceAnalysisPage from './pages/finance/performance-analysis-page';
import BacktestingPage from './pages/finance/backtesting-page';
import PairsTradingPage from './pages/finance/pairs-trading-page';
import VarPage from './pages/finance/var-page';
import StressTestingPage from './pages/finance/stress-testing-page';
import CreditRiskPage from './pages/finance/credit-risk-page';


const analysisCategories = [
    {
        name: 'Portfolio Analysis',
        icon: Wallet,
        items: [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, component: PortfolioOverviewPage, disabled: false },
            { id: 'asset-allocation', label: 'Asset Allocation', icon: PieChart, component: AssetAllocationPage, disabled: false },
            { id: 'performance', label: 'Performance Analysis', icon: LineChart, component: PerformanceAnalysisPage, disabled: false },
        ]
    },
    {
        name: 'Risk Management',
        icon: Shield,
        items: [
            { id: 'var', label: 'Value at Risk (VaR)', icon: TrendingDown, component: VarPage, disabled: false },
            { id: 'stress-testing', label: 'Stress Testing', icon: Zap, component: StressTestingPage, disabled: false },
            { id: 'credit-risk', label: 'Credit Risk (CVA/DVA)', icon: ShieldAlert, component: CreditRiskPage, disabled: false },
        ]
    },
    {
        name: 'Trading Analytics',
        icon: CandlestickChart,
        items: [
            { id: 'backtesting', label: 'Backtesting', icon: History, component: BacktestingPage, disabled: true },
            { id: 'pairs-trading', label: 'Pairs Trading', icon: GitCompare, component: PairsTradingPage, disabled: true }
        ]
    },
];

const analysisPages: Record<string, React.ComponentType<any>> = analysisCategories
  .flatMap(category => category.items)
  .reduce((acc, item) => {
    acc[item.id] = item.component;
    return acc;
  }, {} as Record<string, React.ComponentType<any>>);

export default function FinanceLayout() {
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<string>('overview');
  const [openCategories, setOpenCategories] = useState<string[]>(['Portfolio Analysis', 'Risk Management']);

  const { toast } = useToast();

  const handleClearData = useCallback(() => {
    setData([]);
    setAllHeaders([]);
    setFileName('');
  }, []);

  const handleFileSelected = useCallback((file: File) => {
    toast({ title: 'File Upload', description: 'File upload is not fully implemented in this example.'});
  }, [toast]);

  const handleLoadExample = useCallback((example: ExampleDataset) => {
     toast({ title: 'Example Loaded', description: `${example.name} would be loaded here.`});
  }, [toast]);
  
  const ActivePageComponent = analysisPages[activeAnalysis] || PortfolioOverviewPage;
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
      <div className="flex w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Landmark className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Finance Analytics</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-2 p-2">
            <SidebarMenu>
              {analysisCategories.map(category => (
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
                              disabled={item.disabled}
                            >
                              <item.icon className="h-4 w-4"/>
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
            
            <ActivePageComponent 
                data={data}
                allHeaders={allHeaders}
                onLoadExample={handleLoadExample}
              />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

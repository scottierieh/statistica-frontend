'use client';

import React, { useState } from 'react';
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, Shield, TrendingDown, Zap, ShieldAlert, ArrowLeft, DollarSign, CandlestickChart, Activity, Layers, FileText, Repeat, Puzzle, SlidersHorizontal, GitBranch, Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { UserNav } from '@/components/user-nav';

// Page Components
import VarPage from '@/components/pages/derivatives/var-page';
import StressTestingPage from '@/components/pages/derivatives/stress-testing-page';
import CreditRiskPage from '@/components/pages/derivatives/credit-risk-page';
import OptionsPricingPage from '@/components/pages/derivatives/options-pricing-page';
import ExoticOptionsPage from '@/components/pages/derivatives/exotic-options-page';
import GreeksPage from '@/components/pages/derivatives/greeks-page';
import BondValuationPage from '@/components/pages/derivatives/bond-valuation-page';
import InterestRateSensitivityPage from '@/components/pages/derivatives/interest-rate-sensitivity-page';
import SwapsCapsFloorsPage from '@/components/pages/derivatives/swaps-caps-floors-page';
import StructuredProductsPage from '@/components/pages/derivatives/structured-products-page';
import ModelCalibrationPage from '@/components/pages/derivatives/model-calibration-page';

const analysisCategories = [
    {
        name: 'Risk Management',
        icon: Shield,
        items: [
            { id: 'var', label: 'Value at Risk (VaR)', icon: TrendingDown, component: VarPage, disabled: true },
            { id: 'stress-testing', label: 'Stress Testing', icon: Zap, component: StressTestingPage, disabled: true },
            { id: 'credit-risk', label: 'Credit Risk (CVA/DVA)', icon: ShieldAlert, component: CreditRiskPage, disabled: true },
        ]
    },
     {
        name: 'Option Pricing & Greeks',
        icon: DollarSign,
        items: [
            { id: 'options-pricing', label: 'Options Pricing', icon: CandlestickChart, component: OptionsPricingPage, disabled: true },
            { id: 'exotic-options', label: 'Exotic Options', icon: Layers, component: ExoticOptionsPage, disabled: true },
            { id: 'greeks-analysis', label: 'Greeks Analysis', icon: Sigma, component: GreeksPage, disabled: true },
        ]
    },
    {
        name: 'Fixed Income',
        icon: FileText,
        items: [
            { id: 'bond-valuation', label: 'Bond Valuation', icon: FileText, component: BondValuationPage, disabled: true },
            { id: 'interest-rate-sensitivity', label: 'Duration & Convexity', icon: Activity, component: InterestRateSensitivityPage, disabled: true },
            { id: 'swaps-caps-floors', label: 'IRS, Caps & Floors', icon: Repeat, component: SwapsCapsFloorsPage, disabled: true },
        ]
    },
    {
        name: 'Structured Products',
        icon: Puzzle,
        items: [
            { id: 'structured-products', label: 'ELS/DLS Analysis', icon: Puzzle, component: StructuredProductsPage, disabled: true },
        ]
    },
    {
        name: 'Model Calibration',
        icon: SlidersHorizontal,
        items: [
            { id: 'model-calibration', label: 'Volatility Surface', icon: GitBranch, component: ModelCalibrationPage, disabled: true },
        ]
    },
];

const analysisPages: Record<string, React.ComponentType<any>> = analysisCategories
  .flatMap(category => category.items)
  .reduce((acc, item) => {
    acc[item.id] = item.component;
    return acc;
  }, {} as Record<string, React.ComponentType<any>>);

export default function DerivativesLayout() {
  const [activeAnalysis, setActiveAnalysis] = useState<string>('var');
  const [openCategories, setOpenCategories] = useState<string[]>(['Risk Management', 'Option Pricing & Greeks', 'Fixed Income', 'Structured Products', 'Model Calibration']);

  const ActivePageComponent = analysisPages[activeAnalysis] || VarPage;
  
  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  };

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-muted/30">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <DollarSign className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Derivatives & Risk</h1>
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
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Tools
                        </Link>
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="md:hidden"/>
                    <UserNav />
                </div>
            </header>
            
            <ActivePageComponent />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

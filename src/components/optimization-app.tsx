
'use client';

import { useState } from 'react';
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
import { Target, Truck, Award, Atom, ChevronDown } from 'lucide-react';
import LinearProgrammingPage from './pages/linear-programming-page';
import TransportationProblemPage from './pages/transportation-problem-page';
import GoalProgrammingPage from './pages/goal-programming-page';
import NonlinearProgrammingPage from './pages/nonlinear-programming-page';
import AhpPage from './pages/ahp-page';
import DeaPage from './pages/dea-page';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { cn } from '@/lib/utils';

type OptimizationType = 'linear-programming' | 'transportation-problem' | 'goal-programming' | 'nonlinear-programming' | 'ahp' | 'dea';

const optimizationPages: Record<string, React.ComponentType<any>> = {
  'linear-programming': LinearProgrammingPage,
  'transportation-problem': TransportationProblemPage,
  'goal-programming': GoalProgrammingPage,
  'nonlinear-programming': NonlinearProgrammingPage,
  'ahp': AhpPage,
  'dea': DeaPage,
};

export default function DecisionAnalyticsApp() {
  const [activeAnalysis, setActiveAnalysis] = useState<OptimizationType>('linear-programming');
  const ActivePageComponent = optimizationPages[activeAnalysis];
  const [openCategories, setOpenCategories] = useState<string[]>(['Optimization', 'Quantitative Analysis']);

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
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Target className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Decision Analytics</h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
               <Collapsible open={openCategories.includes('Optimization')} onOpenChange={() => toggleCategory('Optimization')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start text-base px-2">
                    Optimization
                    <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes('Optimization') && 'rotate-180')}/>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveAnalysis('linear-programming')}
                        isActive={activeAnalysis === 'linear-programming'}
                      >
                        Linear Programming
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveAnalysis('nonlinear-programming')}
                        isActive={activeAnalysis === 'nonlinear-programming'}
                      >
                        <Atom className="mr-2 h-4 w-4" />
                        Nonlinear Programming
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveAnalysis('transportation-problem')}
                        isActive={activeAnalysis === 'transportation-problem'}
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        Transportation Problem
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveAnalysis('goal-programming')}
                        isActive={activeAnalysis === 'goal-programming'}
                      >
                        <Award className="mr-2 h-4 w-4" />
                        Goal Programming
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                 </CollapsibleContent>
              </Collapsible>
               <Collapsible open={openCategories.includes('Quantitative Analysis')} onOpenChange={() => toggleCategory('Quantitative Analysis')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start text-base px-2">
                    Quantitative Analysis
                    <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes('Quantitative Analysis') && 'rotate-180')}/>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => setActiveAnalysis('ahp')}
                            isActive={activeAnalysis === 'ahp'}
                        >
                           AHP Analysis
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => setActiveAnalysis('dea')}
                            isActive={activeAnalysis === 'dea'}
                        >
                           Data Envelopment Analysis
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-2xl font-headline font-bold md:hidden">Decision Analytics</h1>
              <div />
            </header>
            <ActivePageComponent />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

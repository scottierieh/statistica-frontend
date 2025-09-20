
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
  SidebarMenu
} from '@/components/ui/sidebar';
import GradientDescentPage from "./pages/gradient-descent-page";
import CentralLimitTheoremPage from './pages/central-limit-theorem-page';
import { FastForward, PlayCircle, TrendingUp } from 'lucide-react';

type SimulationType = 'gradient-descent' | 'central-limit-theorem';

const simulationPages: Record<string, React.ComponentType<any>> = {
  'gradient-descent': GradientDescentPage,
  'central-limit-theorem': CentralLimitTheoremPage,
};

export default function SimulationApp() {
  const [activeSimulation, setActiveSimulation] = useState<SimulationType>('gradient-descent');
  
  const ActivePageComponent = simulationPages[activeSimulation] || GradientDescentPage;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <FastForward className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Simulation</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-2 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSimulation('gradient-descent')}
                  isActive={activeSimulation === 'gradient-descent'}
                >
                  <PlayCircle />
                  <span>Gradient Descent</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSimulation('central-limit-theorem')}
                  isActive={activeSimulation === 'central-limit-theorem'}
                >
                  <TrendingUp />
                  <span>Central Limit Theorem</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger className="md:hidden"/>
                <h1 className="text-2xl font-headline font-bold md:hidden">Simulation</h1>
                <div />
            </header>
            
            <ActivePageComponent />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

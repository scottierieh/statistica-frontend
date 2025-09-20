
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
import MarketingAnalysisPage from './pages/marketing-analysis-page';
import { FastForward, PlayCircle, TrendingUp, BarChart } from 'lucide-react';
import type { ExampleDataSet } from '@/lib/example-datasets';
import { DataSet } from '@/lib/stats';


type SimulationType = 'gradient-descent' | 'central-limit-theorem' | 'marketing-analysis';

const simulationPages: Record<string, React.ComponentType<any>> = {
  'gradient-descent': GradientDescentPage,
  'central-limit-theorem': CentralLimitTheoremPage,
  'marketing-analysis': MarketingAnalysisPage,
};

export default function SimulationApp() {
  const [activeSimulation, setActiveSimulation] = useState<SimulationType>('gradient-descent');
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  
  const handleLoadExampleData = (example: ExampleDataSet) => {
    // This is a simplified loader for the marketing dashboard example
    // A more robust implementation would handle parsing like in statistica-app
    const lines = example.data.trim().split('\n');
    const headers = lines[0].split(',');
    const dataRows = lines.slice(1).map(line => {
        const values = line.split(',');
        const row: Record<string, string | number> = {};
        headers.forEach((header, i) => {
            const num = parseFloat(values[i]);
            row[header] = isNaN(num) ? values[i] : num;
        });
        return row;
    });
    setData(dataRows);
    setAllHeaders(headers);
    if(example.recommendedAnalysis) {
        setActiveSimulation(example.recommendedAnalysis as SimulationType);
    }
  }

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
               <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSimulation('marketing-analysis')}
                  isActive={activeSimulation === 'marketing-analysis'}
                >
                  <BarChart />
                  <span>Marketing Analysis</span>
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
            
            <ActivePageComponent data={data} allHeaders={allHeaders} onLoadExample={handleLoadExampleData} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

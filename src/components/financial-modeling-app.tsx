
'use client';

import { useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
} from '@/components/ui/sidebar';
import {
  DollarSign,
  Activity,
} from 'lucide-react';
import PortfolioAnalysisPage from './pages/portfolio-analysis-page';

type AnalysisType = 'portfolio' | string;

const analysisPages: Record<string, React.ComponentType<any>> = {
    portfolio: PortfolioAnalysisPage,
};

const analysisMenu = [
  {
    field: 'Portfolio Management',
    icon: Activity,
    methods: [
      { id: 'portfolio', label: 'Portfolio Analysis' },
    ]
  },
];

export default function FinancialModelingApp() {
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType>('portfolio');
  
  const ActivePageComponent = analysisPages[activeAnalysis] || PortfolioAnalysisPage;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <DollarSign className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Financial Modeling</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-2 p-2">
            <SidebarMenu>
              {analysisMenu.map((category) => (
                <SidebarMenuItem key={category.field}>
                  {category.methods.map(method => (
                    <SidebarMenuButton
                      key={method.id}
                      onClick={() => setActiveAnalysis(method.id as AnalysisType)}
                      isActive={activeAnalysis === method.id}
                    >
                      <category.icon />
                      <span>{method.label}</span>
                    </SidebarMenuButton>
                  ))}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
             <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger className="md:hidden"/>
                <h1 className="text-2xl font-headline font-bold md:hidden">Financial Modeling</h1>
                <div />
            </header>
            
            <ActivePageComponent />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

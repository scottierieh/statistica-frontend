
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
} from '@/components/ui/sidebar';
import { Target } from 'lucide-react';
import LinearProgrammingPage from './pages/linear-programming-page';

type OptimizationType = 'linear-programming';

const optimizationPages: Record<string, React.ComponentType<any>> = {
  'linear-programming': LinearProgrammingPage,
};

export default function OptimizationApp() {
  const [activeAnalysis, setActiveAnalysis] = useState<OptimizationType>('linear-programming');
  const ActivePageComponent = optimizationPages[activeAnalysis];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Target className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Optimization</h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveAnalysis('linear-programming')}
                isActive={activeAnalysis === 'linear-programming'}
              >
                Linear Programming
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-2xl font-headline font-bold md:hidden">Optimization</h1>
              <div />
            </header>
            <ActivePageComponent />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

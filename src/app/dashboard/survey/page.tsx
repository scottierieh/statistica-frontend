
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
import {
  FileText,
  History,
  ClipboardList,
  LayoutTemplate,
  Settings as SettingsIcon,
  BarChart2,
  LayoutDashboard
} from 'lucide-react';
import SurveyApp from '@/components/survey-app';

type SurveySection = 'design' | 'history' | 'templates';

export default function SurveyPage() {
  const [activeSection, setActiveSection] = useState<SurveySection>('design');
  
  const renderContent = () => {
    switch (activeSection) {
      case 'design':
        return <SurveyApp />;
      case 'history':
        return <div className="p-8 text-center">History of surveys will be displayed here.</div>;
      case 'templates':
        return <div className="p-8 text-center">Survey templates will be available here.</div>;
      default:
        return <SurveyApp />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <ClipboardList className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Survey Tool</h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('design')}
                  isActive={activeSection === 'design'}
                >
                  <LayoutDashboard />
                  <span>Design & Analysis</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('history')}
                  isActive={activeSection === 'history'}
                >
                  <History />
                  <span>History</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('templates')}
                  isActive={activeSection === 'templates'}
                >
                  <LayoutTemplate />
                  <span>Templates</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-2xl font-headline font-bold md:hidden">Survey Tool</h1>
              <div />
            </header>
            {renderContent()}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

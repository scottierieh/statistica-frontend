
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
  SidebarMenu
} from '@/components/ui/sidebar';
import { ClipboardList, LayoutDashboard, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

type SurveySection = 'design' | 'dashboard' | 'analysis';

const SurveyDesignPage = () => (
    <Card>
        <CardHeader>
            <CardTitle>Survey Design</CardTitle>
            <CardDescription>This section is under construction. Tools for designing your survey will be available here.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Build your survey questions, add logic, and customize the look and feel.</p>
        </CardContent>
    </Card>
);

const SurveyDashboardPage = () => (
     <Card>
        <CardHeader>
            <CardTitle>Settings & Distribution</CardTitle>
            <CardDescription>This section is under construction. Manage survey settings and distribution channels.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Configure survey dates, respondent access, and share your survey via links or QR codes.</p>
        </CardContent>
    </Card>
);

const SurveyAnalysisPage = () => (
     <Card>
        <CardHeader>
            <CardTitle>Analysis & Results</CardTitle>
            <CardDescription>This section is under construction. Analyze responses and visualize your data.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">View real-time results, generate charts, and export your data.</p>
        </CardContent>
    </Card>
);

const surveyPages: Record<string, React.ComponentType<any>> = {
  'design': SurveyDesignPage,
  'dashboard': SurveyDashboardPage,
  'analysis': SurveyAnalysisPage,
};

export default function SurveyApp() {
  const [activeSection, setActiveSection] = useState<SurveySection>('design');

  const ActivePageComponent = surveyPages[activeSection] || SurveyDesignPage;

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
          <SidebarContent className="flex flex-col gap-2 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('design')}
                  isActive={activeSection === 'design'}
                >
                  <ClipboardList />
                  <span>Survey Design</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('dashboard')}
                  isActive={activeSection === 'dashboard'}
                >
                  <LayoutDashboard />
                  <span>Settings & Distribution</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('analysis')}
                  isActive={activeSection === 'analysis'}
                >
                  <BarChart2 />
                  <span>Analysis & Results</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger className="md:hidden"/>
                <h1 className="text-2xl font-headline font-bold md:hidden">Survey Tool</h1>
                <div />
            </header>
            
            <ActivePageComponent />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

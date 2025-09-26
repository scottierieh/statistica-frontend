
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
  SidebarMenu
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ClipboardList, History, LayoutTemplate } from 'lucide-react';
import SurveyApp from '@/components/survey-app';

type SurveySection = 'survey' | 'history' | 'templates';

export default function SurveyPage() {
  const [activeSection, setActiveSection] = useState<SurveySection>('survey');

  const renderContent = () => {
    switch (activeSection) {
      case 'survey':
        return <SurveyApp />;
      case 'history':
        return (
          <Card className="w-full max-w-2xl mx-auto text-center">
            <CardHeader>
              <CardTitle>Survey History</CardTitle>
              <CardDescription>This section is under construction. View past surveys and their results here soon!</CardDescription>
            </CardHeader>
          </Card>
        );
      case 'templates':
        return (
          <Card className="w-full max-w-2xl mx-auto text-center">
            <CardHeader>
              <CardTitle>Survey Templates</CardTitle>
              <CardDescription>This section is under construction. Browse and use pre-built survey templates here soon!</CardDescription>
            </CardHeader>
          </Card>
        );
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
          <SidebarContent className="flex flex-col gap-2 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('survey')}
                  isActive={activeSection === 'survey'}
                >
                  <ClipboardList />
                  <span>Survey</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('history')}
                  isActive={activeSection === 'history'}
                >
                  <History />
                  <span>Survey History</span>
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


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
  Plus,
  BarChart2,
  LayoutDashboard,
  Edit,
  Eye,
  Network
} from 'lucide-react';
import SurveyApp from '@/components/survey-app';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type SurveySection = 'design' | 'hub' | 'templates';

// Mock data for survey history
const mockSurveys = [
    { id: '1', title: 'Customer Satisfaction Survey 2024', responses: 152, createdAt: '2024-07-15', status: 'Active' },
    { id: '2', title: 'Employee Engagement Q2', responses: 88, createdAt: '2024-06-20', status: 'Closed' },
    { id: '3', title: 'New Feature Feedback', responses: 341, createdAt: '2024-07-01', status: 'Active' },
    { id: '4', title: 'Website Usability Test', responses: 56, createdAt: '2024-05-10', status: 'Draft' },
];


const SurveyHub = () => {
    const router = useRouter();

    const handleNewSurvey = () => {
        const newId = Date.now().toString();
        router.push(`/dashboard/survey?id=${newId}`);
    };
    
    const handleNewConjointSurvey = () => {
        const newId = Date.now().toString();
        router.push(`/dashboard/survey?id=${newId}&template=conjoint`);
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Survey Hub</CardTitle>
                    <CardDescription>Create new surveys or manage your past and active ones.</CardDescription>
                </div>
                <div className='flex gap-2'>
                    <Button onClick={handleNewConjointSurvey}>
                        <Network className="mr-2" /> New Conjoint Survey
                    </Button>
                    <Button onClick={handleNewSurvey}>
                        <Plus className="mr-2" /> New Survey
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Responses</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockSurveys.map(survey => (
                            <TableRow key={survey.id}>
                                <TableCell className="font-medium">{survey.title}</TableCell>
                                <TableCell><Badge variant={survey.status === 'Active' ? 'default' : 'secondary'}>{survey.status}</Badge></TableCell>
                                <TableCell className="text-right">{survey.responses}</TableCell>
                                <TableCell>{survey.createdAt}</TableCell>
                                <TableCell className="flex gap-2">
                                     <Link href={`/dashboard/survey?id=${survey.id}`}>
                                        <Button variant="outline" size="icon">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                     <Link href={`/survey/view/general/${survey.id}`} target="_blank">
                                        <Button variant="ghost" size="icon">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};


export default function SurveyPage() {
  const searchParams = useSearchParams();
  const surveyId = searchParams.get('id');

  const [activeSection, setActiveSection] = useState<SurveySection>('hub');
  
  const renderContent = () => {
    if (surveyId) {
        return <SurveyApp />;
    }
    
    switch (activeSection) {
      case 'hub':
        return <SurveyHub />;
      case 'templates':
        return <div className="p-8 text-center">Survey templates will be available here.</div>;
      default:
        return <SurveyHub />;
    }
  };

  // Determine which section should be active based on URL
  useEffect(() => {
    if (surveyId) {
      setActiveSection('design');
    } else {
      setActiveSection('hub');
    }
  }, [surveyId]);

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
                <Link href="/dashboard/survey" className="w-full">
                    <SidebarMenuButton
                      isActive={activeSection === 'hub' && !surveyId}
                    >
                      <History />
                      <span>Survey Hub</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/dashboard/survey1" className="w-full">
                    <SidebarMenuButton>
                      <ClipboardList />
                      <span>Survey Tool 1</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('design')}
                  isActive={activeSection === 'design'}
                  disabled={!surveyId}
                >
                  <LayoutDashboard />
                  <span>Design &amp; Analysis</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection('templates')}
                  isActive={activeSection === 'templates'}
                  disabled
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


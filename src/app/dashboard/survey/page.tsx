'use client';

import React, { useState, useEffect } from 'react';
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ClipboardList, History, LayoutTemplate, PlusCircle, Settings } from 'lucide-react';
import SurveyApp from '@/components/survey-app';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { Switch } from '@/components/ui/switch';

type SurveySection = 'survey' | 'history' | 'templates' | 'setting';

function SurveyHistory() {
  const [savedSurveys, setSavedSurveys] = useState<any[]>([]);

  useEffect(() => {
    const keys = Object.keys(localStorage);
    const surveyKeys = keys.filter(key => key.match(/^\d+$/) && !key.endsWith('_responses') && !key.endsWith('_views'));
    
    const surveys = surveyKeys.map(key => {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          // Add a createdDate if it doesn't exist for sorting
          if (!parsed.createdDate) {
            parsed.createdDate = new Date().toISOString();
          }
          return parsed;
        }
      } catch (e) {
        console.error(`Could not parse survey with key: ${key}`);
        return null;
      }
      return null;
    }).filter(s => s !== null);

    // Sort by most recently created
    surveys.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());

    setSavedSurveys(surveys);
  }, []);

  return (
    <div className="space-y-4">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Survey History</CardTitle>
                        <CardDescription>
                            Here are your saved survey designs. Click on a survey to continue editing.
                        </CardDescription>
                    </div>
                     <Button asChild>
                        <Link href={`/dashboard/survey?id=${Date.now()}`}><PlusCircle className="mr-2 h-4 w-4" /> Create New Survey</Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {savedSurveys.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {savedSurveys.map(survey => (
                            <Card key={survey.id}>
                                <CardHeader>
                                    <CardTitle className="truncate">{survey.title}</CardTitle>
                                    <CardDescription>
                                        Last saved: {new Date(survey.createdDate).toLocaleString()}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{survey.description || "No description."}</p>
                                </CardContent>
                                <CardFooter>
                                     <Button asChild className="w-full">
                                        <Link href={`/dashboard/survey?id=${survey.id}`}>Edit Survey</Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">You have no saved surveys.</p>
                         <Button asChild variant="link">
                            <Link href={`/dashboard/survey?id=${Date.now()}`}>Start designing your first survey</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

function SurveySettings() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(),
        to: addDays(new Date(), 20),
    });

    return (
         <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Survey Settings</CardTitle>
              <CardDescription>Manage general settings and configurations for your survey.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="survey-title">Survey Title</Label>
                    <Input id="survey-title" placeholder="Enter survey title" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="survey-description">Survey Description</Label>
                    <Textarea id="survey-description" placeholder="Enter a short description" />
                </div>
                <div className="space-y-2">
                    <Label>Response Period</Label>
                    <DatePickerWithRange date={date} onDateChange={setDate} />
                </div>
                 <div className="flex items-center space-x-2">
                    <Switch id="limit-responses" />
                    <Label htmlFor="limit-responses">Limit to one response per person</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="allow-edit" />
                    <Label htmlFor="allow-edit">Allow respondents to edit after submission</Label>
                </div>
            </CardContent>
            <CardFooter>
                <Button>Save Settings</Button>
            </CardFooter>
        </Card>
    )
}


export default function SurveyPage() {
  const [activeSection, setActiveSection] = useState<SurveySection>('survey');

  const renderContent = () => {
    switch (activeSection) {
      case 'survey':
        return <SurveyApp />;
      case 'history':
        return <SurveyHistory />;
      case 'setting':
        return <SurveySettings />;
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
        <Sidebar collapsible="icon" expandOnHover={true}>
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
                  onClick={() => setActiveSection('setting')}
                  isActive={activeSection === 'setting'}
                >
                  <Settings />
                  <span>Setting</span>
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

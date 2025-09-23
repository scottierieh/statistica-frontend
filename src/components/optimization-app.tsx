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
import { Button } from '@/components/ui/button';
import {
  Zap,
  FlaskConical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

type OptimizationType = 'linear-programming';

export default function OptimizationApp() {
  const [activeAnalysis, setActiveAnalysis] = useState<OptimizationType>('linear-programming');

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Optimization</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-2 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveAnalysis('linear-programming')}
                  isActive={activeAnalysis === 'linear-programming'}
                >
                  <FlaskConical />
                  <span>Linear Programming</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger className="md:hidden"/>
                <h1 className="text-2xl font-headline font-bold md:hidden">Optimization</h1>
                <div />
            </header>
            
            <div className="flex flex-1 items-center justify-center h-full">
              <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                  <CardTitle className="font-headline">Optimization Tools</CardTitle>
                  <CardDescription>
                    This section is under construction. Advanced optimization tools are coming soon!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Stay tuned for updates.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

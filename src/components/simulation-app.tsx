
'use client';

import { useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FastForward, Waypoints } from "lucide-react";
import GradientDescentPage from './pages/gradient-descent-page';

const simulationMenu = [
  {
    id: 'gradient-descent',
    label: 'Gradient Descent',
    icon: Waypoints,
    component: GradientDescentPage,
  },
];

export default function SimulationApp() {
    const [activeMethod, setActiveMethod] = useState<string | null>('gradient-descent');
    
    const ActivePageComponent = activeMethod ? simulationMenu.find(m => m.id === activeMethod)?.component : null;

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
                        <div className="flex-1 overflow-y-auto">
                            <SidebarMenu>
                                {simulationMenu.map((method) => (
                                <SidebarMenuItem key={method.id}>
                                    <SidebarMenuButton
                                        onClick={() => setActiveMethod(method.id)}
                                        isActive={activeMethod === method.id}
                                        className="justify-start w-full h-8 text-sm"
                                    >
                                        <method.icon className="h-4 w-4" />
                                        <span>{method.label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </div>
                    </SidebarContent>
                </Sidebar>
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                     {ActivePageComponent ? (
                        <ActivePageComponent />
                    ) : (
                        <div className="flex flex-1 items-center justify-center h-full">
                            <Card className="w-full max-w-3xl text-center">
                                <CardHeader>
                                    <div className="mx-auto bg-secondary p-4 rounded-full mb-4">
                                        <FastForward className="h-12 w-12 text-secondary-foreground" />
                                    </div>
                                    <CardTitle className="font-headline text-3xl">
                                        Simulation Workbench
                                    </CardTitle>
                                    <CardDescription>
                                        Select a simulation model from the sidebar to begin.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">Advanced modeling and simulation tools will be available here soon.</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </main>
            </div>
        </SidebarProvider>
    );
}

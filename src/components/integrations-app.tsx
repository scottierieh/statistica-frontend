'use client';

import React, { useState, useMemo } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
  SidebarGroupLabel,
  SidebarFooter
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Link2,
  Share2,
  Megaphone,
  Users,
  Database,
  Calendar,
  Key,
  ArrowLeft,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  Activity,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { UserNav } from "@/components/user-nav";
import { Separator } from "@/components/ui/separator";

// Sub-pages
import SNSApiPage from './pages/integrations/sns-api-page';
import AdsApiPage from './pages/integrations/ads-api-page';
import CRMPage from './pages/integrations/crm-page';
import DBConnectorPage from './pages/integrations/db-connector-page';
import SchedulingPage from './pages/integrations/scheduling-page';
import FinanceApiPage from './pages/integrations/finance-api-page';

const menuItems = [
  { id: 'sns', label: 'SNS API', icon: Share2, component: SNSApiPage },
  { id: 'ads', label: 'Ads API', icon: Megaphone, component: AdsApiPage },
  { id: 'finance', label: 'Finance API', icon: TrendingUp, component: FinanceApiPage },
  { id: 'crm', label: 'CRM Systems', icon: Users, component: CRMPage },
  { id: 'db', label: 'DB Connector', icon: Database, component: DBConnectorPage },
  { id: 'automation', label: 'Scheduling & Automation', icon: Calendar, component: SchedulingPage },
];

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] border-2 border-dashed rounded-xl bg-muted/10">
      <Activity className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
      <h2 className="text-xl font-semibold text-muted-foreground">{title} module is ready for setup</h2>
      <p className="text-sm text-muted-foreground mt-1">Configure your API credentials to start syncing data.</p>
    </div>
  );
}

export default function IntegrationsApp() {
  const [activeTab, setActiveTab] = useState('sns');

  const ActivePage = useMemo(() => {
    const item = menuItems.find(m => m.id === activeTab);
    return item ? item.component : SNSApiPage;
  }, [activeTab]);

  const activeLabel = menuItems.find(m => m.id === activeTab)?.label || 'Data Integrations';

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="offcanvas">
          <SidebarHeader>
            <div className="p-2 space-y-4">
              <div className="flex items-center justify-between">
                <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
                </Link>
              </div>
              <Separator />
              <div className="px-2">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Connectivity Hub</h2>
                <div className="flex items-center gap-2 text-primary">
                  <Link2 className="w-5 h-5" />
                  <span className="font-bold text-sm truncate">External Sources</span>
                </div>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroupLabel className="px-4 text-[10px] uppercase font-bold text-muted-foreground/60">Data Connectors</SidebarGroupLabel>
            <SidebarMenu className="px-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.id)}
                    isActive={activeTab === item.id}
                    className="w-full justify-start gap-3"
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            
            <Separator className="my-2" />
            
            <SidebarGroupLabel className="px-4 text-[10px] uppercase font-bold text-muted-foreground/60">Security & Status</SidebarGroupLabel>
            <SidebarMenu className="px-2">
              <SidebarMenuItem>
                <SidebarMenuButton className="gap-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Token Safety</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="gap-3">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Real-time Status</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Workspace
              </Link>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="flex flex-col h-full">
            <header className="flex h-16 items-center justify-between px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                  <h1 className="text-sm font-semibold tracking-tight">{activeLabel}</h1>
                </div>
              </div>
              <UserNav />
            </header>
            <main className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              <div className="max-w-6xl mx-auto">
                <ActivePage title={activeLabel} />
              </div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
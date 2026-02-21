'use client';

import DashboardClientLayout from "@/components/dashboard-client-layout";
import SettingsPage from "@/components/pages/statistica/settings-page";
import { UserNav } from "@/components/user-nav";
import Link from "next/link";
import { Settings, LayoutDashboard } from "lucide-react";

export default function SettingsRoute() {
  return (
    <DashboardClientLayout>
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-40 flex h-16 items-center border-b bg-background/80 px-6 backdrop-blur-md">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold tracking-tight hidden sm:block">Dashboard</h1>
          </Link>
          


          <div className="ml-auto flex items-center gap-4">
            <UserNav />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <SettingsPage />
        </main>
      </div>
    </DashboardClientLayout>
  );
}

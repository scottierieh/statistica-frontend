'use client';

import OptimizationApp from '@/components/optimization-app';
import DashboardClientLayout from '@/components/dashboard-client-layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Target } from 'lucide-react';
import Link from 'next/link';
import { UserNav } from '@/components/user-nav';

export default function OptimizationPage() {
  return (
    <DashboardClientLayout>
      <div className="flex flex-col min-h-screen bg-slate-100">
        <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Workspace
              </Link>
            </Button>
          </div>
          <div className="flex-1 flex justify-center">
            <Link href="/dashboard/optimization" className="flex items-center justify-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-headline font-bold">Decision Analytics</h1>
            </Link>
          </div>
          <div className="w-[210px] flex justify-end">
            <UserNav />
          </div>
        </header>
        <main className="flex-1 overflow-auto">
            <OptimizationApp />
        </main>
      </div>
    </DashboardClientLayout>
  );
}

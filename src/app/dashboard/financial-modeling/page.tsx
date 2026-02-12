'use client';

import FinancialModelingApp from '@/components/financial-modeling-app';
import DashboardClientLayout from '@/components/dashboard-client-layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Landmark } from 'lucide-react';
import Link from 'next/link';
import { UserNav } from '@/components/user-nav';

export default function FinancialModelingPage() {
  return (
    <DashboardClientLayout>
      <div className="flex flex-col min-h-screen bg-background">
        <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-card">
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Workspace
              </Link>
            </Button>
          </div>
          <div className="flex-1 flex justify-center">
            <Link href="/" className="flex items-center justify-center gap-2">
              <Landmark className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-headline font-bold">Financial Modeling</h1>
            </Link>
          </div>
          <div className="w-[210px] flex justify-end">
            <UserNav />
          </div>
        </header>
        <main className="flex-1 overflow-auto">
  <div className="max-w-[1600px] mx-auto">
    <FinancialModelingApp />
  </div>
</main>
      </div>
    </DashboardClientLayout>
  );
}